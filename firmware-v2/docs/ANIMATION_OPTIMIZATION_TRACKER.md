# Suivi de l'optimisation des animations

## Utilisation

Ce tableau suit le passage de chaque mode dans
`ANIMATION_OPTIMIZATION_CHECKLIST.md`. Une case représente un jalon complet et
non une simple inspection partielle.

### Légende des jalons

- `Audit` : identification, état mémoire, allocations, rendu et calculs
  inventoriés ;
- `Base` : mesures et comportement avant modification enregistrés ;
- `Opt.` : optimisation ciblée implémentée, ou décision documentée de ne rien
  changer ;
- `Hôte` : tests avant/après ajoutés et suite complète réussie ;
- `Build` : compilation Photon 2.3.1 et mesures après modification enregistrées ;
- `HW 1 %` : flash et validation physique avec `B:1` ;
- `Com./Doc` : commentaires des sources conformes à `AGENT.md`, documentation
  et tableau de mesures à jour ;
- `Commit` : commit dédié créé.

### Priorités initiales

- `P0` : état RAM majeur, allocation dynamique ou risque mémoire immédiat ;
- `P1` : état notable, calcul coûteux, chaîne dynamique ou ressource réseau ;
- `P2` : animation active à auditer après les principaux gisements ;
- `P3` : mode masqué, désactivé, interne ou à réévaluer après récupération de
  marge mémoire.

Les priorités sont des hypothèses d'ordre de passage. L'audit peut les modifier.

## État du passage code

Les 70 modes et les six éléments partagés ont terminé les jalons `Audit`,
`Opt.`, `Hôte`, `Build` et `Com./Doc`. La suite complète compte 99 tests hôte et
le binaire courant mesure 109 360 octets de Flash pour 18 732 octets de RAM
statique.

Les baselines longues, validations visuelles et commits encore décochés restent
volontairement en attente. Un smoke test à `B:1` n'est pas assimilé à une
validation physique complète. Le détail quantifié se trouve dans
`ANIMATION_OPTIMIZATION_SUMMARY.md`.

## Modes actifs

| Pri. | ID | Nom historique | Implémentation | Audit | Base | Opt. | Hôte | Build | HW 1 % | Com./Doc | Commit | État / notes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P2 | 0 | Off | `src/core/mode_runtime.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état propre ; transition linéaire partagée, retour `Off,B:1` validé |
| P2 | 26 | Shuffle | `src/core/mode_runtime.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Ordre 248→62 octets, −192 RAM au jalon ; smoke `B:1`, cycle complet restant |
| P2 | 7 | AcidDream | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Boucle longue conservée ; essai visuel complet en attente |
| P2 | 15 | Breathe | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | État compact ; 19,2 FPS stables, visuel restant |
| P1 | 65 | BouncyCube | `src/animations/cube_bounce.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −24 RAM, +24 libres ; 19,2 FPS, visuel restant |
| P2 | 13 | Burst | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Index et compteurs compacts ; 13,1 FPS, visuel restant |
| P2 | 49 | BuildAWall | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Deux buffers locaux bornés ; baseline longue et visuel en attente |
| P2 | 3 | Chaser | `src/animations/color_all.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Atténuation entière partagée ; 2,7 FPS, visuel restant |
| P1 | 31 | CheerLights | `src/network/cheerlights.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −40 RAM, −800 Flash ; 430 frames, réponse `#800080`, visuel restant |
| P2 | 25 | ChristmasLights | `src/animations/christmas.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Compteurs bornés ; frame 9,63 s stable, visuel restant |
| P2 | 24 | ChristmasTree | `src/animations/christmas.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Étoile/flocon compacts ; 2,4 FPS stable, switches/visuel restants |
| P1 | 37 | Clock | `src/animations/clock.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Texte 330,5 FPS, 3D 37,0 ; flash/runtime `B:1`, visuel restant |
| P1 | 11 | Collide | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état propre ; frame >12 s conservée, cycle/visuel restants |
| P0 | 42 | Collide2 | `src/animations/collide2.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −1 296 RAM statique/libre +1 296 ; flash/runtime `B:1`, visuel restant |
| P2 | 2 | ColorAll | `src/rendering/transitions.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Facteurs par étape ; −112 Flash, 448→432 ms, smoke `B:1`, visuel restant |
| P0 | 57 | CrumblingPlane | `src/animations/crumble.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −864 Flash, −24 RAM statique, +288 libres ; flash/runtime `B:1` validés, visuel restant |
| P2 | 29 | Cubes | `src/animations/cubes.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | État déjà compact ; 15,7 FPS stable, switches/visuel restants |
| P2 | 34 | CubeClassics | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Ordre local 68→17 octets ; cycle complet en attente |
| P1 | 33 | CubePainter | `src/animations/cube_painter.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Sans `substring`, −128 Flash au jalon ; endpoint/runtime `B:1`, visuel restant |
| P2 | 69 | DiagonalPlanes | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Sommets globaux retirés ; baseline longue et visuel en attente |
| P1 | 36 | Digi | `src/animations/digi.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Scratch déjà optimal ; frame >12 s, cycle/visuel restants |
| P2 | 17 | DualChase | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Index compacts et atténuation partagée ; 2,7 FPS |
| P2 | 32 | Filler | `src/animations/filler.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | État persistant 8→1 octet ; cycle matériel long en attente |
| P1 | 55 | Fireworks | `src/animations/cube_classics.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | 2→1 `tan`/étape ; frame 4,27 s à `S:8`, cycle/visuel restants |
| P2 | 14 | Flicker | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aléatoire conservé ; runtime `B:1`, visuel restant |
| P2 | 68 | Folder | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état à réduire ; baseline longue et visuel en attente |
| P1 | 10 | Frozen | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −102 RAM attendue via scratch ; frame longue, visuel restant |
| P0 | 40 | GoldRain | `src/animations/rain_salvos.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −16 400 RAM statique, +16 400 libres ; flash/runtime `B:1` validés, visuel restant |
| P2 | 35 | IFTTT | `src/network/ifttt_weather.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Longueur C bornée mutualisée ; smoke `B:1`, cycle et visuel restants |
| P2 | 52 | LineSpin | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | 8→1 sinus invariant/frame ; baseline longue et visuel en attente |
| P1 | 62 | LineSpiral | `src/animations/d_spiral.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | État entier compact ; +32 libres au jalon, 18,1 FPS, visuel restant |
| P0 | 64 | Matrix | `src/animations/matrix.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −1 992 RAM statique/libre +1 992 ; flash/runtime `B:1` validés, visuel restant |
| P2 | 54 | MovingSphere | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | 512→0 racine/frame ; 768 000 voxels équivalents, runtime long en attente |
| P1 | 56 | PacMan | `src/animations/puck_dude.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Sprites utiles 780→243 dans l'union ; 18,9→19,1 FPS, visuel restant |
| P2 | 48 | PlaneFill | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état à réduire ; baseline longue et visuel en attente |
| P2 | 46 | Planes | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état à réduire ; baseline longue et visuel en attente |
| P1 | 22 | Plasma | `src/animations/plasma.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | 3→1 racine/voxel, 45,0→62,4 FPS ; runtime `B:1`, sortie noire historique |
| P2 | 16 | Police | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | État compact ; 19,2 FPS stables, visuel restant |
| P2 | 5 | Pulse | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Boucle longue conservée ; essai visuel complet en attente |
| P2 | 67 | Pyramid | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état à réduire ; baseline longue et visuel en attente |
| P1 | 30 | Rain | `src/animations/rain.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Facteurs entiers exacts ; +32 libres au jalon, 6,5 FPS, switches/visuel restants |
| P2 | 8 | Rainbow | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Parcours couleur conservé ; baseline 0,9 FPS, visuel restant |
| P2 | 66 | RandomPath | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Chemin local borné à 28 octets ; baseline/visuel en attente |
| P2 | 53 | SineLines | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Trigonométries invariantes mutualisées ; runtime/visuel en attente |
| P2 | 51 | SineWave | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Distance réelle conservée pour la phase ; runtime/visuel en attente |
| P1 | 61 | SlidingPlanes | `src/animations/classic_planes.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Position/incrément 8→2 octets ; 15,8 FPS, visuel restant |
| P2 | 70 | SlideShow | `src/animations/slideshow.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Ordre local 92→23 octets, couleur globale retirée ; cycle long en attente |
| P0 | 60 | Snake | `src/animations/snake.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −656 Flash, −32 RAM statique, +184 libres ; flash/runtime `B:1` validés, visuel restant |
| P0 | 21 | Squarrel | `src/animations/squarral.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −496 RAM statique/libre +496 ; flash/runtime `B:1`, visuel restant |
| P1 | 20 | Spectrum | `src/animations/spectrum.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | −128 RAM statique, +128 libres ; 34,5 FPS, visuel restant |
| P2 | 6 | Stripes | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Boucle longue conservée ; essai visuel complet en attente |
| P1 | 27 | Text | `src/animations/text.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | API C fixe, 477,5 FPS ; flash/runtime `B:1`, visuel restant |
| P2 | 9 | TheaterChase | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Parcours historique conservé ; baseline 0,4 FPS, visuel restant |
| P2 | 12 | Transition | `src/animations/classic_color_effects.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Teinte compacte modulo 256 ; 18,8 FPS stables |
| P2 | 43 | UpDown | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Deux buffers locaux bornés ; baseline longue et visuel en attente |
| P2 | 47 | VoxelDrop | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Deux buffers locaux bornés ; baseline longue et visuel en attente |
| P2 | 50 | VoxelRandom | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Traînée 96→24 octets, lecture `-1` retirée ; runtime/visuel en attente |
| P2 | 23 | WarmFade | `src/animations/warm_fade.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Compteur entier, 511 niveaux équivalents ; cycle matériel en attente |
| P1 | 28 | Whirlwind | `src/animations/whirlwind.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Scratch 288 octets initialisé après transition ; 24,8 FPS, visuel restant |
| P2 | 45 | Worms | `src/animations/cube_classics.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état à réduire ; baseline longue et visuel en attente |
| P2 | 4 | Zone | `src/animations/zone.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Bornes partagées ; 0,6 FPS stable, switches/visuel restants |
| P2 | 19 | ZoneChase | `src/animations/zone.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | Index compacts et atténuation partagée ; 2,7 FPS stable |

## Modes masqués, désactivés ou incomplets

| Pri. | ID | Nom historique | Implémentation | Audit | Base | Opt. | Hôte | Build | HW 1 % | Com./Doc | Commit | État / notes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P3 | 1 | Light | `src/core/mode_runtime.cpp` | [x] | N/A | [x] | [x] | [x] | N/A | [x] | [ ] | Fallback EEPROM conservé, entrée `modeStruct` commentée |
| P1 | 18 | Listener | `src/network/udp_listener.cpp` | [x] | N/A | [x] | [x] | [x] | N/A | [x] | [ ] | Build désactivé explicitement ; −1 408 Flash et −80 RAM statique |
| P0 | 39 | AcidRain | `src/animations/rain_salvos.cpp` | [x] | N/A | [x] | [x] | [x] | N/A | [x] | [ ] | État partagé compact et testé ; mode toujours désactivé, aucun test matériel |
| P3 | 41 | Lightning | `src/animations/lightning.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Sous-effet actif de Rain switch 4 ; test matériel et visuel restants |
| P3 | 58 | RomanCandle | `src/animations/roman_candle_disabled.cpp` | [x] | N/A | [x] | [x] | [x] | N/A | [x] | [ ] | Archive commentée, aucune API ni empreinte compilée |
| P3 | 59 | GameOfLife | `src/animations/life_disabled.cpp` | [x] | N/A | [x] | [x] | [x] | N/A | [x] | [ ] | Archive commentée, aucune API ni empreinte compilée |
| P3 | 63 | HyperBall | `src/animations/hyper_disabled.cpp` | [x] | N/A | [x] | [x] | [x] | N/A | [x] | [ ] | Archive commentée, aucune API ni empreinte compilée |
| P3 | 44 | RopeCoil | `src/animations/cube_classics.cpp` | [x] | N/A | [x] | [x] | [x] | N/A | [x] | [ ] | Branche interne auditée ; aucune entrée de mode exposée |

## Éléments partagés à suivre séparément

Ces éléments ne sont pas des modes autonomes, mais une optimisation peut
affecter plusieurs lignes du tableau principal.

| Pri. | Élément | Implémentation | Audit | Base | Opt. | Hôte | Build | HW 1 % | Com./Doc | Commit | État / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Primitives de rendu | `src/rendering/primitives.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [x] | Phase 4 ; validation physique RGB/mapping restante |
| P1 | Mapping voxel | `src/rendering/voxel_mapping.h` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [x] | Phase 4 ; 512 index vérifiés côté hôte |
| P1 | Transitions | `src/rendering/transitions.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [x] | Scratch partagé ; facteurs polaires mutualisés et équivalence exhaustive |
| P1 | CubeGreeting | `src/animations/cube_greeting.cpp` | [x] | [ ] | [x] | [x] | [x] | [ ] | [x] | [ ] | Aucun état propre à réduire ; cycle complet de démonstration reporté |
| P0 | Scratch partagé | `src/core/legacy_state.h` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | 1 536 octets nécessaires ; contrats par vue, durée Whirlwind corrigée |
| P1 | Registre et dispatcher | `src/core/mode_runtime.cpp` | [x] | [x] | [x] | [x] | [x] | [ ] | [x] | [ ] | 62 IDs imposés, ordre compact et permutations validées ; visuel multi-modes restant |

## Ordre de démarrage proposé

L'ordre initial minimise les risques de fragmentation puis attaque les plus gros
gisements connus :

1. Snake ;
2. CrumblingPlane ;
3. GoldRain et AcidRain comme famille `salvos` ;
4. Matrix ;
5. Collide2 ;
6. Squarrel ;
7. CheerLights, Clock et Text pour les chaînes dynamiques ;
8. Spectrum et Plasma pour les boucles chaudes ;
9. autres modes actifs par famille de source ;
10. modes désactivés, puis mutualisation finale des états.

Cet ordre doit être confirmé ou corrigé par les premières mesures de baseline.
