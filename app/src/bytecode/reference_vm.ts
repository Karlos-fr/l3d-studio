// ============================================================================
// BytecodeReferenceVm - Machine virtuelle TypeScript de reference L3D
// ----------------------------------------------------------------------------
// Ce module execute un conteneur valide dans un framebuffer logique isole. Il
// sert aux tests et a la future previsualisation, sans DOM ni transport reseau.
// ============================================================================

import { decodeBytecodeInstruction } from "./decoder";
import {
  BYTECODE_COOPERATIVE_INSTRUCTION_LIMIT,
  BYTECODE_ENTRY_POINT_OFFSET,
  BYTECODE_HEADER_SIZE,
  BYTECODE_PARTICLE_LIMIT,
  BYTECODE_REGISTER_COUNT,
  BYTECODE_SLICE_INSTRUCTION_LIMIT,
  BytecodeErrorCode,
  BytecodeOpcode,
  type DecodedBytecodeInstruction,
} from "./format";
import { validateBytecodeContainer } from "./validator";

// Nombre de voxels du cube logique 8 × 8 × 8.
const VM_VOXEL_COUNT = 512;

// Nombre de composantes RGB par voxel.
const VM_COLOR_COMPONENTS = 3;

// Taille d'un cote du cube logique.
const VM_CUBE_SIDE = 8;

// Echelle fixe Q4.4 utilisee par les particules.
const VM_FIXED_SCALE = 16;

// Plus grande coordonnee Q4.4 encore contenue dans le cube.
const VM_FIXED_MAX = VM_CUBE_SIDE * VM_FIXED_SCALE - 1;

// Valeur non nulle de repli pour le generateur xorshift32.
const VM_RANDOM_FALLBACK_SEED = 0x6d2b79f5;

// Etat public retourne apres une tranche d'execution.
export type BytecodeVmRunState = "yielded" | "waiting" | "halted" | "fault";

// Resultat d'une tranche cooperative.
export interface BytecodeVmRunResult {
  state: BytecodeVmRunState;
  executedInstructions: number;
  errorCode?: BytecodeErrorCode;
}

// Entree de trace stable apres chaque instruction executee.
export interface BytecodeVmTraceEntry {
  offset: number;
  opcode: BytecodeOpcode;
  registers: readonly number[];
  voxelWrites: number;
}

// Particule entiere fixe utilisee par le moteur de reference.
interface ReferenceParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  red: number;
  green: number;
  blue: number;
}

// Configuration courante du moteur de particules.
interface ReferenceParticleConfiguration {
  count: number;
  gravity: number;
  drag: number;
  life: number;
}

// Resultat interne d'une instruction pouvant constituer une frontiere.
interface InstructionExecutionResult {
  boundary: boolean;
  state?: BytecodeVmRunState;
  errorCode?: BytecodeErrorCode;
}

// Machine virtuelle de reference avec etat et framebuffer fixes.
export class BytecodeReferenceVm {
  // Registres signes exposes en lecture aux tests et a la previsualisation.
  readonly registers = new Int16Array(BYTECODE_REGISTER_COUNT);

  // Framebuffer RGB888 logique, range selon z, y, x puis composante.
  readonly framebuffer = new Uint8Array(VM_VOXEL_COUNT * VM_COLOR_COMPONENTS);

  // Trace detaillee et deterministe de la session courante.
  readonly trace: BytecodeVmTraceEntry[] = [];

  // Payload valide execute sans son en-tete.
  private readonly payload: Uint8Array;

  // Particules preallouees a la capacite contractuelle.
  private readonly particles: ReferenceParticle[];

  // Compteur ordinal de la prochaine instruction.
  private programCounter: number;

  // Couleur rouge courante.
  private currentRed = 0;

  // Couleur verte courante.
  private currentGreen = 0;

  // Couleur bleue courante.
  private currentBlue = 0;

  // Etat pseudo-aleatoire xorshift32.
  private randomState: number;

  // Nombre cumule d'instructions depuis la derniere frontiere explicite.
  private instructionsWithoutBoundary = 0;

  // Echeance WAIT en millisecondes uint32, absente hors attente.
  private waitDeadline: number | undefined;

  // Indique qu'un HALT normal a termine la session.
  private halted = false;

  // Derniere faute runtime, absente pendant une session valide.
  private errorCode: BytecodeErrorCode | undefined;

  // Nombre de frames explicitement affichees par SHOW.
  private shownFrameCount = 0;

  // Nombre d'ecritures voxel produites par l'instruction courante.
  private currentInstructionVoxelWrites = 0;

  // Configuration initialement inactive des particules.
  private particleConfiguration: ReferenceParticleConfiguration = {
    count: 0,
    gravity: 0,
    drag: 255,
    life: 1,
  };

  // ------------------------------------------------------------------------
  // Cree une VM depuis un conteneur integralement valide.
  //
  // Parametres :
  // - container : bytecode version 1 a executer.
  // - randomSeed : graine deterministe facultative.
  // ------------------------------------------------------------------------
  constructor(container: Uint8Array, randomSeed = VM_RANDOM_FALLBACK_SEED) {
    // Validation complete exigee avant de copier le payload.
    const validation = validateBytecodeContainer(container);
    if (!validation.valid) {
      throw new Error(`Conteneur bytecode invalide : ${validation.errorCode}`);
    }
    this.payload = container.slice(BYTECODE_HEADER_SIZE);
    this.programCounter = container[BYTECODE_ENTRY_POINT_OFFSET] ?? 0;
    this.randomState = (randomSeed >>> 0) || VM_RANDOM_FALLBACK_SEED;
    this.particles = createReferenceParticles();
  }

  // ------------------------------------------------------------------------
  // Execute une tranche bornee ou poursuit une attente non bloquante.
  //
  // Parametres :
  // - nowMilliseconds : horodatage uint32 fourni par l'appelant.
  //
  // Retour :
  // - etat atteint, nombre d'instructions et faute eventuelle.
  // ------------------------------------------------------------------------
  run(nowMilliseconds: number): BytecodeVmRunResult {
    if (this.errorCode !== undefined) return this.runResult("fault", 0, this.errorCode);
    if (this.halted) return this.runResult("halted", 0);
    // Horodatage normalise comme le compteur millis du firmware.
    const now = nowMilliseconds >>> 0;
    if (this.waitDeadline !== undefined) {
      if (!deadlineReached(now, this.waitDeadline)) return this.runResult("waiting", 0);
      this.waitDeadline = undefined;
    }
    let executedInstructions = 0;
    while (executedInstructions < BYTECODE_SLICE_INSTRUCTION_LIMIT) {
      // Instruction valide situee au compteur ordinal courant.
      const instruction = decodeBytecodeInstruction(this.payload, this.programCounter);
      this.currentInstructionVoxelWrites = 0;
      // Effet de l'instruction et frontiere cooperative eventuelle.
      const result = this.executeInstruction(instruction, now);
      executedInstructions += 1;
      this.instructionsWithoutBoundary += 1;
      this.trace.push({
        offset: instruction.offset,
        opcode: instruction.opcode,
        registers: Array.from(this.registers),
        voxelWrites: this.currentInstructionVoxelWrites,
      });
      if (result.errorCode !== undefined) {
        this.errorCode = result.errorCode;
        this.framebuffer.fill(0);
        return this.runResult("fault", executedInstructions, result.errorCode);
      }
      if (result.boundary) {
        this.instructionsWithoutBoundary = 0;
        return this.runResult(result.state ?? "yielded", executedInstructions);
      }
      if (this.instructionsWithoutBoundary > BYTECODE_COOPERATIVE_INSTRUCTION_LIMIT) {
        this.errorCode = BytecodeErrorCode.Quota;
        this.framebuffer.fill(0);
        return this.runResult("fault", executedInstructions, this.errorCode);
      }
    }
    return this.runResult("yielded", executedInstructions);
  }

  // ------------------------------------------------------------------------
  // Retourne le nombre de frames envoyees par SHOW.
  //
  // Retour :
  // - compteur monotone de SHOW executes dans la session.
  // ------------------------------------------------------------------------
  getShownFrameCount(): number {
    return this.shownFrameCount;
  }

  // ------------------------------------------------------------------------
  // Retourne le compteur ordinal courant pour les diagnostics.
  //
  // Retour :
  // - offset de la prochaine instruction dans le payload.
  // ------------------------------------------------------------------------
  getProgramCounter(): number {
    return this.programCounter;
  }

  // ------------------------------------------------------------------------
  // Execute une instruction decodee et actualise le compteur ordinal.
  //
  // Parametres :
  // - instruction : instruction valide a appliquer.
  // - now : horodatage uint32 de la tranche courante.
  //
  // Retour :
  // - frontiere cooperative et faute runtime eventuelle.
  //
  // Effet de bord :
  // - modifie l'etat VM, les registres, particules ou framebuffer.
  // ------------------------------------------------------------------------
  private executeInstruction(
    instruction: DecodedBytecodeInstruction,
    now: number,
  ): InstructionExecutionResult {
    // Operandes logiques decodes de l'instruction courante.
    const operands = instruction.operands;
    this.programCounter = instruction.offset + instruction.size;
    switch (instruction.opcode) {
      case BytecodeOpcode.Halt:
        this.halted = true;
        return { boundary: true, state: "halted" };
      case BytecodeOpcode.Clear:
        this.framebuffer.fill(0);
        this.currentInstructionVoxelWrites = VM_VOXEL_COUNT;
        return { boundary: false };
      case BytecodeOpcode.Show:
        this.shownFrameCount += 1;
        return { boundary: true, state: "yielded" };
      case BytecodeOpcode.Yield:
        return { boundary: true, state: "yielded" };
      case BytecodeOpcode.Fade:
        this.fade(operands[0] ?? 0);
        return { boundary: false };
      case BytecodeOpcode.SetI8:
      case BytecodeOpcode.SetU8:
        this.setRegister(operands[0], operands[1] ?? 0);
        return { boundary: false };
      case BytecodeOpcode.Copy:
        this.setRegister(operands[0], this.getRegister(operands[1]));
        return { boundary: false };
      case BytecodeOpcode.AddI8:
      case BytecodeOpcode.AddReg: {
        // Valeur immediate ou valeur du second registre selon l'opcode.
        const addition = instruction.opcode === BytecodeOpcode.AddI8
          ? operands[1] ?? 0
          : this.getRegister(operands[1]);
        this.setRegister(operands[0], this.getRegister(operands[0]) + addition);
        return { boundary: false };
      }
      case BytecodeOpcode.SubReg:
        this.setRegister(
          operands[0],
          this.getRegister(operands[0]) - this.getRegister(operands[1]),
        );
        return { boundary: false };
      case BytecodeOpcode.Sin8:
        this.setRegister(operands[0], sin8(this.getRegister(operands[1])));
        return { boundary: false };
      case BytecodeOpcode.RandomU8:
        this.setRegister(operands[0], this.randomBetween(operands[1] ?? 0, operands[2] ?? 0));
        return { boundary: false };
      case BytecodeOpcode.ColorRgb:
        this.setCurrentColor(operands[0] ?? 0, operands[1] ?? 0, operands[2] ?? 0);
        return { boundary: false };
      case BytecodeOpcode.ColorWheel: {
        // Couleur RGB issue de la phase basse du registre.
        const color = wheelColor(this.getRegister(operands[0]) & 0xff);
        this.setCurrentColor(color[0], color[1], color[2]);
        return { boundary: false };
      }
      case BytecodeOpcode.ColorRegisters:
        this.setCurrentColor(
          this.getRegister(operands[0]) & 0xff,
          this.getRegister(operands[1]) & 0xff,
          this.getRegister(operands[2]) & 0xff,
        );
        return { boundary: false };
      case BytecodeOpcode.Voxel:
        return this.drawVoxelFromRegisters(operands);
      case BytecodeOpcode.Sphere:
        return this.drawSphereFromRegisters(operands);
      case BytecodeOpcode.Bounce:
        return this.bounce(operands);
      case BytecodeOpcode.ParticleConfigure:
        this.configureParticles(operands);
        return { boundary: false };
      case BytecodeOpcode.ParticleEmit:
        return this.emitParticle(operands);
      case BytecodeOpcode.ParticleStep:
        this.stepParticles();
        return { boundary: false };
      case BytecodeOpcode.Jump:
        this.programCounter = instruction.jumpTarget ?? this.programCounter;
        return { boundary: false };
      case BytecodeOpcode.JumpIfLess:
        if (this.getRegister(operands[0]) < this.getRegister(operands[1])) {
          this.programCounter = instruction.jumpTarget ?? this.programCounter;
        }
        return { boundary: false };
      case BytecodeOpcode.Wait: {
        // Duree non bloquante encodee sur seize bits.
        const duration = operands[0] ?? 0;
        if (duration > 0) this.waitDeadline = (now + duration) >>> 0;
        return { boundary: true, state: duration > 0 ? "waiting" : "yielded" };
      }
    }
  }

  // ------------------------------------------------------------------------
  // Construit un resultat de tranche avec erreur optionnelle.
  //
  // Parametres :
  // - state : etat public atteint.
  // - executedInstructions : nombre d'instructions de la tranche.
  // - errorCode : faute publique facultative.
  //
  // Retour :
  // - resultat sans propriete d'erreur superflue.
  // ------------------------------------------------------------------------
  private runResult(
    state: BytecodeVmRunState,
    executedInstructions: number,
    errorCode?: BytecodeErrorCode,
  ): BytecodeVmRunResult {
    return errorCode === undefined
      ? { state, executedInstructions }
      : { state, executedInstructions, errorCode };
  }

  // ------------------------------------------------------------------------
  // Lit un registre deja valide par le decodeur.
  //
  // Parametres :
  // - registerIndex : index logique, zero utilise uniquement en repli defensif.
  //
  // Retour :
  // - valeur signee de seize bits.
  // ------------------------------------------------------------------------
  private getRegister(registerIndex: number | undefined): number {
    return this.registers[registerIndex ?? 0] ?? 0;
  }

  // ------------------------------------------------------------------------
  // Ecrit un registre avec rebouclage signe sur seize bits.
  //
  // Parametres :
  // - registerIndex : index logique valide.
  // - value : valeur entiere a ramener sur seize bits.
  //
  // Effet de bord :
  // - modifie un registre de la VM.
  // ------------------------------------------------------------------------
  private setRegister(registerIndex: number | undefined, value: number): void {
    this.registers[registerIndex ?? 0] = wrapInt16(value);
  }

  // ------------------------------------------------------------------------
  // Remplace la couleur courante par trois octets bornes.
  //
  // Parametres :
  // - red : composante rouge.
  // - green : composante verte.
  // - blue : composante bleue.
  //
  // Effet de bord :
  // - modifie la couleur utilisee par les prochains dessins et emissions.
  // ------------------------------------------------------------------------
  private setCurrentColor(red: number, green: number, blue: number): void {
    this.currentRed = red & 0xff;
    this.currentGreen = green & 0xff;
    this.currentBlue = blue & 0xff;
  }

  // ------------------------------------------------------------------------
  // Ecrit un voxel depuis trois registres ou retourne une faute de coordonnee.
  //
  // Parametres :
  // - operands : index des registres x, y et z.
  //
  // Retour :
  // - succes sans frontiere ou faute de coordonnee.
  // ------------------------------------------------------------------------
  private drawVoxelFromRegisters(operands: readonly number[]): InstructionExecutionResult {
    // Coordonnee x lue depuis le premier registre.
    const x = this.getRegister(operands[0]);
    // Coordonnee y lue depuis le deuxieme registre.
    const y = this.getRegister(operands[1]);
    // Coordonnee z lue depuis le troisieme registre.
    const z = this.getRegister(operands[2]);
    if (!validCoordinate(x) || !validCoordinate(y) || !validCoordinate(z)) {
      return { boundary: false, errorCode: BytecodeErrorCode.Coordinate };
    }
    this.setVoxel(x, y, z, this.currentRed, this.currentGreen, this.currentBlue);
    return { boundary: false };
  }

  // ------------------------------------------------------------------------
  // Dessine une sphere pleine bornee depuis trois registres.
  //
  // Parametres :
  // - operands : registres du centre puis rayon immediat.
  //
  // Retour :
  // - succes sans frontiere ou faute de coordonnee.
  // ------------------------------------------------------------------------
  private drawSphereFromRegisters(operands: readonly number[]): InstructionExecutionResult {
    // Centre x entier de la sphere.
    const centerX = this.getRegister(operands[0]);
    // Centre y entier de la sphere.
    const centerY = this.getRegister(operands[1]);
    // Centre z entier de la sphere.
    const centerZ = this.getRegister(operands[2]);
    // Rayon immediat deja valide entre 1 et 7.
    const radius = operands[3] ?? 0;
    if (!validCoordinate(centerX) || !validCoordinate(centerY) || !validCoordinate(centerZ)) {
      return { boundary: false, errorCode: BytecodeErrorCode.Coordinate };
    }
    // Carre du rayon evitant une racine dans la boucle voxel.
    const radiusSquared = radius * radius;
    for (let z = 0; z < VM_CUBE_SIDE; z += 1) {
      for (let y = 0; y < VM_CUBE_SIDE; y += 1) {
        for (let x = 0; x < VM_CUBE_SIDE; x += 1) {
          // Distance signee au centre sur x.
          const deltaX = x - centerX;
          // Distance signee au centre sur y.
          const deltaY = y - centerY;
          // Distance signee au centre sur z.
          const deltaZ = z - centerZ;
          if (deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ <= radiusSquared) {
            this.setVoxel(x, y, z, this.currentRed, this.currentGreen, this.currentBlue);
          }
        }
      }
    }
    return { boundary: false };
  }

  // ------------------------------------------------------------------------
  // Avance une position et inverse la vitesse avant une sortie de plage.
  //
  // Parametres :
  // - operands : registres position et vitesse puis bornes incluses.
  //
  // Retour :
  // - succes sans frontiere ou faute si le rebond reste impossible.
  // ------------------------------------------------------------------------
  private bounce(operands: readonly number[]): InstructionExecutionResult {
    // Index du registre contenant la position.
    const positionRegister = operands[0] ?? 0;
    // Index du registre contenant la vitesse.
    const velocityRegister = operands[1] ?? 0;
    // Borne basse incluse du mouvement.
    const minimum = operands[2] ?? 0;
    // Borne haute incluse du mouvement.
    const maximum = operands[3] ?? 0;
    // Position avant le pas courant.
    const position = this.getRegister(positionRegister);
    let velocity = this.getRegister(velocityRegister);
    let next = position + velocity;
    if (next < minimum || next > maximum) {
      velocity = wrapInt16(-velocity);
      next = position + velocity;
      this.setRegister(velocityRegister, velocity);
    }
    if (next < minimum || next > maximum) {
      return { boundary: false, errorCode: BytecodeErrorCode.Value };
    }
    this.setRegister(positionRegister, next);
    return { boundary: false };
  }

  // ------------------------------------------------------------------------
  // Configure et reinitialise le moteur fixe de particules.
  //
  // Parametres :
  // - operands : capacite, gravite, drag et duree de vie.
  //
  // Effet de bord :
  // - desactive toutes les particules puis remplace leur configuration.
  // ------------------------------------------------------------------------
  private configureParticles(operands: readonly number[]): void {
    this.particleConfiguration = {
      count: operands[0] ?? 0,
      gravity: operands[1] ?? 0,
      drag: operands[2] ?? 255,
      life: operands[3] ?? 1,
    };
    for (const particle of this.particles) particle.active = false;
  }

  // ------------------------------------------------------------------------
  // Emet une particule depuis six registres ou retourne une faute.
  //
  // Parametres :
  // - operands : registres position puis vitesse Q4.4.
  //
  // Retour :
  // - succes sans frontiere ou faute d'etat ou de coordonnee.
  // ------------------------------------------------------------------------
  private emitParticle(operands: readonly number[]): InstructionExecutionResult {
    if (this.particleConfiguration.count < 1) {
      return { boundary: false, errorCode: BytecodeErrorCode.State };
    }
    // Coordonnee initiale x en voxel entier.
    const x = this.getRegister(operands[0]);
    // Coordonnee initiale y en voxel entier.
    const y = this.getRegister(operands[1]);
    // Coordonnee initiale z en voxel entier.
    const z = this.getRegister(operands[2]);
    if (!validCoordinate(x) || !validCoordinate(y) || !validCoordinate(z)) {
      return { boundary: false, errorCode: BytecodeErrorCode.Coordinate };
    }
    // Emplacement fixe libre ou victime deterministe.
    const particle = this.selectParticleForEmission();
    particle.active = true;
    particle.x = x * VM_FIXED_SCALE;
    particle.y = y * VM_FIXED_SCALE;
    particle.z = z * VM_FIXED_SCALE;
    particle.vx = signedLowByte(this.getRegister(operands[3]));
    particle.vy = signedLowByte(this.getRegister(operands[4]));
    particle.vz = signedLowByte(this.getRegister(operands[5]));
    particle.life = this.particleConfiguration.life;
    particle.red = this.currentRed;
    particle.green = this.currentGreen;
    particle.blue = this.currentBlue;
    return { boundary: false };
  }

  // ------------------------------------------------------------------------
  // Choisit un emplacement libre ou la particule la plus proche de sa fin.
  //
  // Retour :
  // - particule fixe a initialiser, sans nouvelle allocation.
  // ------------------------------------------------------------------------
  private selectParticleForEmission(): ReferenceParticle {
    let selected = this.particles[0] as ReferenceParticle;
    for (let index = 0; index < this.particleConfiguration.count; index += 1) {
      // Particule active examinee dans l'ordre stable du tableau.
      const candidate = this.particles[index] as ReferenceParticle;
      if (!candidate.active) return candidate;
      if (candidate.life < selected.life) selected = candidate;
    }
    return selected;
  }

  // ------------------------------------------------------------------------
  // Avance, elimine et dessine les particules actives.
  //
  // Effet de bord :
  // - modifie les particules et le framebuffer, sans appeler SHOW.
  // ------------------------------------------------------------------------
  private stepParticles(): void {
    for (let index = 0; index < this.particleConfiguration.count; index += 1) {
      // Particule courante de la capacite active.
      const particle = this.particles[index] as ReferenceParticle;
      if (!particle.active) continue;
      particle.vy = clampInt8(particle.vy + this.particleConfiguration.gravity);
      particle.vx = applyDrag(particle.vx, this.particleConfiguration.drag);
      particle.vy = applyDrag(particle.vy, this.particleConfiguration.drag);
      particle.vz = applyDrag(particle.vz, this.particleConfiguration.drag);
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;
      particle.life -= 1;
      if (
        particle.life <= 0 ||
        particle.x < 0 || particle.x > VM_FIXED_MAX ||
        particle.y < 0 || particle.y > VM_FIXED_MAX ||
        particle.z < 0 || particle.z > VM_FIXED_MAX
      ) {
        particle.active = false;
        continue;
      }
      this.setVoxel(
        particle.x >> 4,
        particle.y >> 4,
        particle.z >> 4,
        particle.red,
        particle.green,
        particle.blue,
      );
    }
  }

  // ------------------------------------------------------------------------
  // Attenue chaque canal du framebuffer avec troncature entiere.
  //
  // Parametres :
  // - factor : multiplicateur non signe rapporte a 255.
  //
  // Effet de bord :
  // - modifie toutes les composantes du framebuffer.
  // ------------------------------------------------------------------------
  private fade(factor: number): void {
    for (let offset = 0; offset < this.framebuffer.length; offset += 1) {
      this.framebuffer[offset] = Math.trunc((this.framebuffer[offset] ?? 0) * factor / 255);
    }
    this.currentInstructionVoxelWrites = VM_VOXEL_COUNT;
  }

  // ------------------------------------------------------------------------
  // Ecrit un voxel valide dans le framebuffer et compte l'effet de bord.
  //
  // Parametres :
  // - x : coordonnee horizontale de 0 a 7.
  // - y : coordonnee verticale de 0 a 7.
  // - z : profondeur de 0 a 7.
  // - red : composante rouge.
  // - green : composante verte.
  // - blue : composante bleue.
  //
  // Effet de bord :
  // - modifie trois octets et incremente le compteur de trace courant.
  // ------------------------------------------------------------------------
  private setVoxel(
    x: number,
    y: number,
    z: number,
    red: number,
    green: number,
    blue: number,
  ): void {
    // Offset de la composante rouge dans le framebuffer RGB lineaire.
    const offset = ((z * VM_CUBE_SIDE * VM_CUBE_SIDE) + (y * VM_CUBE_SIDE) + x) * 3;
    this.framebuffer[offset] = red;
    this.framebuffer[offset + 1] = green;
    this.framebuffer[offset + 2] = blue;
    this.currentInstructionVoxelWrites += 1;
  }

  // ------------------------------------------------------------------------
  // Tire un entier uniforme inclusif avec xorshift32.
  //
  // Parametres :
  // - minimum : borne basse incluse.
  // - maximum : borne haute incluse.
  //
  // Retour :
  // - entier pseudo-aleatoire deterministe dans la plage.
  // ------------------------------------------------------------------------
  private randomBetween(minimum: number, maximum: number): number {
    let value = this.randomState;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    // Nombre de valeurs de l'intervalle inclusif.
    const range = maximum - minimum + 1;
    return minimum + (this.randomState % range);
  }
}

// ----------------------------------------------------------------------------
// Cree les 32 particules fixes dans un etat inactif.
//
// Retour :
// - tableau prealloue a la limite contractuelle.
// --------------------------------------------------------------------------
function createReferenceParticles(): ReferenceParticle[] {
  // Tableau alloue une seule fois a la construction de la VM de test.
  const particles: ReferenceParticle[] = [];
  for (let index = 0; index < BYTECODE_PARTICLE_LIMIT; index += 1) {
    particles.push({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      red: 0,
      green: 0,
      blue: 0,
    });
  }
  return particles;
}

// ----------------------------------------------------------------------------
// Indique si une echeance uint32 est atteinte malgre le rebouclage.
//
// Parametres :
// - now : horodatage courant uint32.
// - deadline : echeance uint32 a comparer.
//
// Retour :
// - vrai quand l'echeance est atteinte ou depassee.
// --------------------------------------------------------------------------
function deadlineReached(now: number, deadline: number): boolean {
  return ((now - deadline) | 0) >= 0;
}

// ----------------------------------------------------------------------------
// Reboucle une valeur en entier signe de seize bits.
//
// Parametres :
// - value : valeur entiere a convertir.
//
// Retour :
// - valeur equivalente signee sur seize bits.
// --------------------------------------------------------------------------
function wrapInt16(value: number): number {
  return (value << 16) >> 16;
}

// ----------------------------------------------------------------------------
// Convertit l'octet bas d'un registre en entier signe.
//
// Parametres :
// - value : valeur de registre dont seul l'octet bas est lu.
//
// Retour :
// - entier signe compris entre -128 et 127.
// --------------------------------------------------------------------------
function signedLowByte(value: number): number {
  // Octet bas extrait de la valeur de registre.
  const byte = value & 0xff;
  return byte >= 0x80 ? byte - 0x100 : byte;
}

// ----------------------------------------------------------------------------
// Borne une vitesse Q4.4 sur un octet signe.
//
// Parametres :
// - value : vitesse intermediaire a borner.
//
// Retour :
// - entier tronque compris entre -128 et 127.
// --------------------------------------------------------------------------
function clampInt8(value: number): number {
  return Math.max(-128, Math.min(127, Math.trunc(value)));
}

// ----------------------------------------------------------------------------
// Applique le drag avec troncature vers zero.
//
// Parametres :
// - value : vitesse Q4.4 courante.
// - drag : multiplicateur rapporte a 255.
//
// Retour :
// - vitesse freinee et tronquee vers zero.
// --------------------------------------------------------------------------
function applyDrag(value: number, drag: number): number {
  return Math.trunc(value * drag / 255);
}

// ----------------------------------------------------------------------------
// Indique si une coordonnee entiere appartient au cube.
//
// Parametres :
// - value : coordonnee a verifier.
//
// Retour :
// - vrai pour un entier compris entre 0 et 7.
// --------------------------------------------------------------------------
function validCoordinate(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < VM_CUBE_SIDE;
}

// ----------------------------------------------------------------------------
// Calcule le sinus entier contractuel pour un tour sur 256 valeurs.
//
// Parametres :
// - value : phase dont seul l'octet bas est lu.
//
// Retour :
// - amplitude non signee comprise entre 0 et 255.
// --------------------------------------------------------------------------
function sin8(value: number): number {
  // Angle en radians associe a la phase modulo 256.
  const angle = ((value & 0xff) / 256) * Math.PI * 2;
  return Math.round((Math.sin(angle) + 1) * 127.5);
}

// ----------------------------------------------------------------------------
// Convertit un index de roue en couleur RGB888 historique compacte.
//
// Parametres :
// - position : phase couleur dont seul l'octet bas est lu.
//
// Retour :
// - triplet rouge, vert et bleu compris entre 0 et 255.
// --------------------------------------------------------------------------
function wheelColor(position: number): [number, number, number] {
  // Phase inversee pour conserver l'ordre de la roue NeoPixel historique.
  const inverted = 255 - (position & 0xff);
  if (inverted < 85) return [255 - inverted * 3, 0, inverted * 3];
  if (inverted < 170) {
    // Position locale dans le second tiers de la roue.
    const shifted = inverted - 85;
    return [0, shifted * 3, 255 - shifted * 3];
  }
  // Position locale dans le dernier tiers de la roue.
  const shifted = inverted - 170;
  return [shifted * 3, 255 - shifted * 3, 0];
}
