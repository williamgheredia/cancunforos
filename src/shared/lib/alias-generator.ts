const ANIMALS = [
  'Tlacuache', 'Iguana', 'Coati', 'Ajolote', 'Quetzal',
  'Jaguar', 'Tucan', 'Tortuga', 'Pelicano', 'Delfin',
  'Armadillo', 'Guacamaya', 'Mono', 'Lagarto', 'Cangrejo',
  'Flamenco', 'Mariposa', 'Colibri', 'Puma', 'Mapache',
]

const ADJECTIVES = [
  'Agotado', 'Curioso', 'Veloz', 'Hambriento', 'Perdido',
  'Brillante', 'Nocturno', 'Tropical', 'Valiente', 'Tranquilo',
  'Salvaje', 'Electrico', 'Dorado', 'Cosmico', 'Picante',
  'Volador', 'Furioso', 'Dormido', 'Radiante', 'Epico',
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
