// ============================================================================
// CircularBuffer - Implementation d'un historique circulaire generique
// ----------------------------------------------------------------------------
// Ce fichier conserve un nombre fixe de valeurs dans leur ordre chronologique.
// Il ne connait ni les diagnostics, ni le DOM, ni le reseau.
// ============================================================================

export interface CircularBuffer<TValue> {
  capacity: number;
  storage: Array<TValue | undefined>;
  startIndex: number;
  length: number;
}

// ----------------------------------------------------------------------------
// Cree un buffer circulaire vide avec une capacite strictement positive.
//
// Parametres :
// - capacity : nombre maximal de valeurs conservees.
//
// Retour :
// - buffer prealloue pret a recevoir des valeurs.
// ----------------------------------------------------------------------------
export function createCircularBuffer<TValue>(capacity: number): CircularBuffer<TValue> {
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("La capacite du buffer circulaire doit etre un entier positif.");
  }
  return {
    capacity,
    storage: new Array<TValue | undefined>(capacity),
    startIndex: 0,
    length: 0,
  };
}

// ----------------------------------------------------------------------------
// Ajoute une valeur et remplace la plus ancienne lorsque le buffer est plein.
//
// Parametres :
// - buffer : buffer circulaire mutable cible.
// - value : valeur a ajouter en position chronologique finale.
//
// Effet de bord :
// - modifie le stockage, la longueur et eventuellement l'index de depart.
// ----------------------------------------------------------------------------
export function pushCircularBuffer<TValue>(
  buffer: CircularBuffer<TValue>,
  value: TValue,
): void {
  const insertionIndex = (buffer.startIndex + buffer.length) % buffer.capacity;
  buffer.storage[insertionIndex] = value;
  if (buffer.length < buffer.capacity) {
    buffer.length += 1;
    return;
  }
  buffer.startIndex = (buffer.startIndex + 1) % buffer.capacity;
}

// ----------------------------------------------------------------------------
// Restitue une copie des valeurs dans leur ordre chronologique.
//
// Parametres :
// - buffer : buffer circulaire a parcourir.
//
// Retour :
// - tableau dense allant de la valeur la plus ancienne a la plus recente.
// ----------------------------------------------------------------------------
export function circularBufferValues<TValue>(buffer: CircularBuffer<TValue>): TValue[] {
  const values: TValue[] = [];
  for (let offset = 0; offset < buffer.length; offset += 1) {
    const index = (buffer.startIndex + offset) % buffer.capacity;
    const value = buffer.storage[index];
    if (value !== undefined) values.push(value);
  }
  return values;
}

// ----------------------------------------------------------------------------
// Vide un buffer sans changer sa capacite ni reallouer son stockage.
//
// Parametres :
// - buffer : buffer circulaire mutable a vider.
//
// Effet de bord :
// - efface les references conservees et remet ses index a zero.
// ----------------------------------------------------------------------------
export function clearCircularBuffer<TValue>(buffer: CircularBuffer<TValue>): void {
  buffer.storage.fill(undefined);
  buffer.startIndex = 0;
  buffer.length = 0;
}
