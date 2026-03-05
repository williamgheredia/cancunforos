const ADJECTIVES = [
  'Agil', 'Alto', 'Audaz', 'Azul', 'Bravo',
  'Calmo', 'Ciber', 'Cool', 'Denso', 'Dulce',
  'Epico', 'Fiel', 'Fiero', 'Flash', 'Fugaz',
  'Genio', 'Gran', 'Gris', 'Habil', 'Letal',
  'Libre', 'Listo', 'Loco', 'Magno', 'Mayor',
  'Mega', 'Mero', 'Mudo', 'Naval', 'Neo',
  'Noble', 'Nulo', 'Osado', 'Polar', 'Proto',
  'Puro', 'Raro', 'Real', 'Rojo', 'Rudo',
  'Sabio', 'Seco', 'Solar', 'Super', 'Titan',
  'Turbo', 'Ultra', 'Unico', 'Veloz', 'Zen',
]

const ANIMALS = [
  'Puma', 'Lobo', 'Oso', 'Buho', 'Zorro',
  'Gato', 'Leon', 'Tigre', 'Rana', 'Pez',
  'Mono', 'Tucan', 'Coral', 'Pulpo', 'Erizo',
  'Grillo', 'Gecko', 'Coati', 'Delfin', 'Cuervo',
  'Perico', 'Jaguar', 'Iguana', 'Halcon', 'Nutria',
  'Ocelote', 'Cobra', 'Medusa', 'Narval', 'Gaviota',
  'Aguila', 'Coyote', 'Ajolote', 'Colibri', 'Mapache',
  'Quetzal', 'Morsa', 'Lince', 'Vibora', 'Sapo',
  'Mirlo', 'Alce', 'Trucha', 'Conejo', 'Ganso',
  'Grulla', 'Tapir', 'Carpa', 'Guaco', 'Mosca',
]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateAlias(): string {
  const adjective = randomFrom(ADJECTIVES)
  const animal = randomFrom(ANIMALS)
  const number = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `${adjective}${animal}_${number}`
}
