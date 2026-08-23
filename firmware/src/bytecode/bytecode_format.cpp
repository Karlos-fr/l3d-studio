// ============================================================================
// BytecodeFormat - Implementation des proprietes d'instruction L3D
// ----------------------------------------------------------------------------
// Ce module traduit les opcodes en tailles et capacites fixes. Il ne lit aucun
// conteneur et ne produit aucun effet de rendu.
// ============================================================================

#ifdef L3D_UNITY_BUILD

#if L3D_BYTECODE_ENABLED

// ----------------------------------------------------------------------------
// Retourne la taille binaire exacte d'un opcode version 1.
//
// Parametres :
// - opcode : octet d'operation a reconnaitre.
//
// Retour :
// - taille totale de l'instruction, ou zero pour un opcode inconnu.
// ----------------------------------------------------------------------------
uint8_t bytecodeInstructionSize(uint8_t opcode) {
    switch(opcode) {
        case BYTECODE_OPCODE_HALT:
        case BYTECODE_OPCODE_CLEAR:
        case BYTECODE_OPCODE_SHOW:
        case BYTECODE_OPCODE_YIELD:
        case BYTECODE_OPCODE_PARTICLE_STEP:
            return 1;
        case BYTECODE_OPCODE_FADE:
        case BYTECODE_OPCODE_COPY:
        case BYTECODE_OPCODE_ADD_REG:
        case BYTECODE_OPCODE_SUB_REG:
        case BYTECODE_OPCODE_SIN8:
        case BYTECODE_OPCODE_COLOR_WHEEL:
        case BYTECODE_OPCODE_JUMP:
            return 2;
        case BYTECODE_OPCODE_SET_I8:
        case BYTECODE_OPCODE_SET_U8:
        case BYTECODE_OPCODE_ADD_I8:
        case BYTECODE_OPCODE_COLOR_REGISTERS:
        case BYTECODE_OPCODE_VOXEL:
        case BYTECODE_OPCODE_JUMP_IF_LESS:
        case BYTECODE_OPCODE_WAIT:
            return 3;
        case BYTECODE_OPCODE_RANDOM_U8:
        case BYTECODE_OPCODE_COLOR_RGB:
        case BYTECODE_OPCODE_SPHERE:
        case BYTECODE_OPCODE_BOUNCE:
        case BYTECODE_OPCODE_PARTICLE_EMIT:
            return 4;
        case BYTECODE_OPCODE_PARTICLE_CONFIGURE:
            return 5;
        default:
            return 0;
    }
}

// ----------------------------------------------------------------------------
// Retourne la capacite optionnelle exigee par un opcode.
//
// Parametres :
// - opcode : operation version 1 deja reconnue.
//
// Retour :
// - bit de capacite, ou zero pour le coeur de la VM.
// ----------------------------------------------------------------------------
uint8_t bytecodeRequiredCapability(uint8_t opcode) {
    if(opcode == BYTECODE_OPCODE_SPHERE)
        return BYTECODE_CAPABILITY_GEOMETRY;
    if(opcode == BYTECODE_OPCODE_PARTICLE_CONFIGURE ||
       opcode == BYTECODE_OPCODE_PARTICLE_EMIT ||
       opcode == BYTECODE_OPCODE_PARTICLE_STEP)
        return BYTECODE_CAPABILITY_PARTICLES;
    if(opcode == BYTECODE_OPCODE_SIN8)
        return BYTECODE_CAPABILITY_MATH8;
    return 0;
}

#endif

#endif
