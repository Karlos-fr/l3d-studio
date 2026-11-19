// ============================================================================
// VirtualCubeFetch - Transport vers le cube virtuel de la chambre ProjectShelf
// ----------------------------------------------------------------------------
// Remplace fetch lorsque l'adresse LAN vaut « cube-virtuel ». Les requetes
// partent sur le BroadcastChannel « l3d-virtual-cube », ou la chambre 3D de
// karlos-fr.github.io/project-shelf fait tourner le vrai firmware en WebAssembly
// (firmware/emulator). Les deux pages doivent partager la meme origine et etre
// ouvertes dans le meme navigateur. Ce fichier ne connait ni le DOM ni les routes.
// ============================================================================

// Adresse reservee qui designe le cube virtuel au lieu d'un Photon du reseau.
export const VIRTUAL_CUBE_HOST = "cube-virtuel";

// Canal partage avec la chambre.
const VIRTUAL_CUBE_CHANNEL = "l3d-virtual-cube";

type VirtualCubeResponse = {
  kind: "l3d-response";
  id: string;
  status?: number;
  headers?: [string, string][];
  body?: ArrayBuffer;
  error?: string;
};

let sharedChannel: BroadcastChannel | null = null;
const waiting = new Map<string, (response: VirtualCubeResponse) => void>();

// ----------------------------------------------------------------------------
// Ouvre une seule fois le canal et route chaque reponse vers son appelant.
// ----------------------------------------------------------------------------
function openChannel(): BroadcastChannel {
  if (sharedChannel !== null) return sharedChannel;
  sharedChannel = new BroadcastChannel(VIRTUAL_CUBE_CHANNEL);
  sharedChannel.onmessage = (event: MessageEvent<VirtualCubeResponse>) => {
    const message = event.data;
    if (message?.kind !== "l3d-response") return;
    const resolve = waiting.get(message.id);
    if (resolve === undefined) return;
    waiting.delete(message.id);
    resolve(message);
  };
  return sharedChannel;
}

// ----------------------------------------------------------------------------
// Implementation fetch compatible avec le client LAN.
//
// Parametres :
// - input : URL http://cube-virtuel:port/api/v1/... construite par le client.
// - init : methode, corps et signal d'annulation.
//
// Retour :
// - Response reconstruite depuis la reponse HTTP du firmware.
// ----------------------------------------------------------------------------
export const virtualCubeFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  const body = init?.body === undefined || init.body === null
    ? null
    : await new Response(init.body).arrayBuffer();
  const signal = init?.signal ?? null;
  if (signal?.aborted) throw new DOMException("Requete annulee.", "AbortError");

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const channel = openChannel();
  const response = await new Promise<VirtualCubeResponse>((resolve, reject) => {
    const abort = () => {
      waiting.delete(id);
      reject(new DOMException("Requete annulee.", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    waiting.set(id, (message) => {
      signal?.removeEventListener("abort", abort);
      resolve(message);
    });
    channel.postMessage({
      kind: "l3d-request",
      id,
      method,
      path: url.pathname + url.search,
      contentType: headers.get("Content-Type"),
      body,
    });
  });
  if (response.error !== undefined || response.status === undefined) {
    throw new TypeError(`Cube virtuel : ${response.error ?? "reponse vide"}.`);
  }
  return new Response(response.status === 204 ? null : response.body ?? null, {
    status: response.status,
    headers: response.headers ?? [],
  });
};
