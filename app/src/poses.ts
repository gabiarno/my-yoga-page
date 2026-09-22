import type { PoseDef } from './types';

/**
 * Biblioteca de posturas, en el orden en que aparecen dentro de cada bloque.
 *
 * En los textos de las posturas asimétricas:
 *   {pie} / {otro}     → "derecho" / "izquierdo" (masculino, lado que trabaja / el contrario)
 *   {pierna} / {otra}  → "derecha" / "izquierda" (femenino, lado que trabaja / el contrario)
 * El "lado que trabaja" es la pierna delantera en los guerreros y el triángulo, y la
 * pierna que se eleva en los equilibrios.
 */
export const POSES: PoseDef[] = [
  // ── Centrado ─────────────────────────────────────────────
  {
    id: 'sukhasana',
    name: 'Postura fácil',
    sanskrit: 'Sukhasana',
    block: 'centering',
    level: 1,
    sided: false,
    hold: 60,
    breathing: true,
    enter: [
      'Siéntate cómodamente con las piernas cruzadas.',
      'Alarga la columna y apoya las manos sobre las rodillas.',
      'Si te apetece, cierra los ojos.',
    ],
    cues: [
      'Inhala por la nariz, llenando el abdomen.',
      'Exhala despacio, soltando tensiones.',
      'Relaja los hombros, lejos de las orejas.',
      'Observa tu respiración, sin forzarla.',
    ],
  },

  // ── Calentamiento ────────────────────────────────────────
  {
    id: 'gato-vaca',
    name: 'Gato y vaca',
    sanskrit: 'Marjaryasana · Bitilasana',
    block: 'warmup',
    level: 1,
    sided: false,
    hold: 45,
    view: 'side',
    avoid: ['wrists'],
    enter: ['Ven a cuatro apoyos: manos bajo los hombros y rodillas bajo las caderas.'],
    cues: [
      'Al inhalar, arquea la espalda y mira al frente.',
      'Al exhalar, redondea la espalda y lleva el mentón al pecho.',
      'Mueve la columna vértebra a vértebra, al ritmo de tu respiración.',
    ],
  },
  {
    id: 'perro-abajo',
    name: 'Perro boca abajo',
    sanskrit: 'Adho Mukha Svanasana',
    block: 'warmup',
    level: 1,
    sided: false,
    hold: 40,
    view: 'side',
    avoid: ['wrists'],
    enter: [
      'Desde cuatro apoyos, mete los dedos de los pies y eleva la cadera hacia el techo.',
      'Forma una uve invertida con tu cuerpo.',
    ],
    cues: [
      'Empuja el suelo con las manos.',
      'Lleva los talones hacia el suelo, sin forzar.',
      'Relaja el cuello y deja caer la cabeza.',
    ],
  },
  {
    id: 'uttanasana',
    name: 'Flexión de pie',
    sanskrit: 'Uttanasana',
    block: 'warmup',
    level: 1,
    sided: false,
    hold: 30,
    view: 'side',
    avoid: ['lowback'],
    enter: [
      'Camina con las manos hacia los pies y quédate de pie, flexionado hacia delante.',
      'Flexiona un poco las rodillas si lo necesitas.',
    ],
    cues: ['Deja colgar la cabeza y los brazos.', 'Con cada exhalación, suelta un poco más.'],
  },

  // ── De pie ───────────────────────────────────────────────
  {
    id: 'tadasana',
    name: 'Montaña',
    sanskrit: 'Tadasana',
    block: 'standing',
    level: 1,
    sided: false,
    hold: 30,
    view: 'front',
    enter: [
      'Ponte de pie, de frente a la cámara.',
      'Pies a la anchura de las caderas y brazos a los lados del cuerpo.',
    ],
    cues: [
      'Reparte el peso entre ambos pies.',
      'Alarga la coronilla hacia el techo.',
      'Hombros relajados y pecho abierto.',
    ],
  },
  {
    id: 'utkatasana',
    name: 'Silla',
    sanskrit: 'Utkatasana',
    block: 'standing',
    level: 1,
    sided: false,
    hold: 30,
    view: 'side',
    avoid: ['knees'],
    enter: [
      'Colócate de lado a la cámara.',
      'Flexiona las rodillas como si fueras a sentarte en una silla.',
      'Sube los brazos junto a las orejas.',
    ],
    cues: ['Lleva el peso a los talones.', 'Mantén el pecho abierto.', 'Respira. Aguanta un poco más.'],
  },
  {
    id: 'guerrero-1',
    name: 'Guerrero I',
    sanskrit: 'Virabhadrasana I',
    block: 'standing',
    level: 1,
    sided: true,
    hold: 30,
    view: 'side',
    enter: [
      'Colócate de lado a la cámara.',
      'Da un paso largo hacia atrás con el pie {otro}.',
      'Flexiona la rodilla {pierna} hasta formar un ángulo recto y sube los brazos al cielo.',
    ],
    cues: [
      'Lleva las caderas hacia el frente.',
      'Presiona el talón de atrás contra el suelo.',
      'Brazos estirados y hombros lejos de las orejas.',
    ],
  },
  {
    id: 'guerrero-2',
    name: 'Guerrero II',
    sanskrit: 'Virabhadrasana II',
    block: 'standing',
    level: 1,
    sided: true,
    hold: 30,
    view: 'front',
    enter: [
      'Colócate de frente a la cámara, con las piernas bien abiertas.',
      'Gira el pie {pie} hacia fuera y flexiona esa rodilla.',
      'Extiende los brazos en cruz, paralelos al suelo, y mira hacia la mano {pierna}.',
    ],
    cues: [
      'La rodilla delantera, sobre el tobillo.',
      'Pierna de atrás firme y estirada.',
      'Hombros relajados y torso vertical.',
    ],
  },
  {
    id: 'trikonasana',
    name: 'Triángulo',
    sanskrit: 'Trikonasana',
    block: 'standing',
    level: 1,
    sided: true,
    hold: 30,
    view: 'front',
    enter: [
      'De frente a la cámara y con las piernas abiertas, gira el pie {pie} hacia fuera.',
      'Estira las dos piernas y alarga el tronco hacia el lado {pie}.',
      'Baja la mano {pierna} a la espinilla y sube la otra hacia el cielo.',
    ],
    cues: [
      'Abre el pecho hacia el techo.',
      'Mantén las dos piernas firmes.',
      'Mira hacia la mano de arriba, si tu cuello lo permite.',
    ],
  },

  // ── Equilibrio ───────────────────────────────────────────
  {
    id: 'vrksasana',
    name: 'Árbol',
    sanskrit: 'Vrksasana',
    block: 'balance',
    level: 1,
    sided: true,
    hold: 30,
    view: 'front',
    enter: [
      'Ponte de pie, de frente a la cámara.',
      'Apoya el peso en la pierna {otra} y lleva la planta del pie {pie} al interior de la otra pierna, por encima o por debajo de la rodilla.',
      'Junta las manos frente al pecho.',
    ],
    cues: [
      'Fija la mirada en un punto que no se mueva.',
      'Abre la rodilla hacia el lado.',
      'Si pierdes el equilibrio, no pasa nada: vuelve a empezar.',
    ],
  },
  {
    id: 'guerrero-3',
    name: 'Guerrero III',
    sanskrit: 'Virabhadrasana III',
    block: 'balance',
    level: 2,
    sided: true,
    hold: 20,
    view: 'side',
    avoid: ['balance'],
    enter: [
      'Colócate de lado a la cámara y apoya el peso en la pierna {otra}.',
      'Inclina el torso hacia delante mientras elevas la pierna {pierna} hacia atrás.',
      'Busca una línea recta desde las manos hasta el talón.',
    ],
    cues: ['Caderas niveladas, mirando al suelo.', 'Activa la pierna de apoyo.', 'Respira con calma.'],
  },

  // ── Suelo ────────────────────────────────────────────────
  {
    id: 'balasana',
    name: 'Postura del niño',
    sanskrit: 'Balasana',
    block: 'floor',
    level: 1,
    sided: false,
    hold: 40,
    breathing: true,
    avoid: ['knees'],
    enter: [
      'Baja al suelo y siéntate sobre los talones.',
      'Lleva la frente al suelo y estira los brazos hacia delante.',
    ],
    cues: ['Respira hacia la espalda.', 'Deja que la frente descanse.'],
  },
  {
    id: 'bhujangasana',
    name: 'Cobra',
    sanskrit: 'Bhujangasana',
    block: 'floor',
    level: 1,
    sided: false,
    hold: 25,
    view: 'side',
    avoid: ['lowback'],
    enter: [
      'Túmbate boca abajo, con las manos bajo los hombros.',
      'Al inhalar, eleva el pecho usando la espalda, con los codos cerca del cuerpo.',
    ],
    cues: ['Hombros lejos de las orejas.', 'Empuja el pubis contra el suelo.'],
  },
  {
    id: 'setu',
    name: 'Puente',
    sanskrit: 'Setu Bandhasana',
    block: 'floor',
    level: 1,
    sided: false,
    hold: 30,
    view: 'side',
    enter: [
      'Túmbate boca arriba de lado a la cámara, con las rodillas flexionadas y los pies cerca de los glúteos.',
      'Presiona los pies contra el suelo y eleva la cadera.',
    ],
    cues: ['Rodillas paralelas, apuntando al frente.', 'Abre el pecho y respira.'],
  },
  {
    id: 'paschimottanasana',
    name: 'Pinza sentada',
    sanskrit: 'Paschimottanasana',
    block: 'floor',
    level: 1,
    sided: false,
    hold: 40,
    view: 'side',
    avoid: ['lowback'],
    enter: [
      'Siéntate con las piernas estiradas al frente.',
      'Al inhalar, crece; al exhalar, inclínate hacia delante desde la cadera.',
    ],
    cues: ['Lleva el pecho hacia los muslos, no la cabeza a las rodillas.', 'Suelta un poco más en cada exhalación.'],
  },
  {
    id: 'baddha-konasana',
    name: 'Mariposa',
    sanskrit: 'Baddha Konasana',
    block: 'floor',
    level: 1,
    sided: false,
    hold: 40,
    avoid: ['knees'],
    enter: [
      'Siéntate y junta las plantas de los pies.',
      'Deja que las rodillas caigan hacia los lados.',
    ],
    cues: ['Columna larga.', 'Relaja las caderas en cada exhalación.'],
  },
  {
    id: 'apanasana',
    name: 'Rodillas al pecho',
    sanskrit: 'Apanasana',
    block: 'floor',
    level: 1,
    sided: false,
    hold: 30,
    enter: ['Túmbate boca arriba y abraza las rodillas contra el pecho.'],
    cues: ['Balancéate suavemente de lado a lado.', 'Masajea la zona lumbar contra el suelo.'],
  },
  {
    id: 'torsion-supina',
    name: 'Torsión tumbada',
    sanskrit: 'Supta Matsyendrasana',
    block: 'floor',
    level: 1,
    sided: true,
    hold: 30,
    enter: [
      'Túmbate boca arriba y abraza la rodilla {pierna} contra el pecho.',
      'Llévala hacia el lado {otro} y abre los brazos en cruz.',
      'Mira hacia la mano {pierna}.',
    ],
    cues: ['Deja que la gravedad haga el trabajo.', 'Hombros apoyados en el suelo.'],
  },

  // ── Relajación ───────────────────────────────────────────
  {
    id: 'savasana',
    name: 'Relajación final',
    sanskrit: 'Savasana',
    block: 'relax',
    level: 1,
    sided: false,
    hold: 120,
    breathing: true,
    enter: [
      'Túmbate boca arriba, con los brazos a los lados y las palmas hacia arriba.',
      'Cierra los ojos y deja que todo el cuerpo pese sobre el suelo.',
    ],
    cues: [
      'Suelta cualquier control sobre la respiración.',
      'Relaja la cara, la mandíbula y los hombros.',
      'Simplemente, descansa.',
    ],
  },
];

export const poseById = (id: string): PoseDef => {
  const pose = POSES.find((p) => p.id === id);
  if (!pose) throw new Error(`Postura desconocida: ${id}`);
  return pose;
};
