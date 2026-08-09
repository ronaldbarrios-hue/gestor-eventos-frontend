/* Lista de países con su código ISO (para la bandera) y nombre en español.
   La bandera se genera automáticamente a partir del código usando emojis
   regionales de Unicode — no requiere imágenes ni librerías externas. */

export function bandera(codigoIso) {
  return codigoIso
    .toUpperCase()
    .replace(/./g, letra => String.fromCodePoint(127397 + letra.charCodeAt(0)));
}

export const PAISES = [
  { code: 'CO', nombre: 'Colombia' },
  { code: 'MX', nombre: 'México' },
  { code: 'AR', nombre: 'Argentina' },
  { code: 'CL', nombre: 'Chile' },
  { code: 'PE', nombre: 'Perú' },
  { code: 'EC', nombre: 'Ecuador' },
  { code: 'VE', nombre: 'Venezuela' },
  { code: 'BO', nombre: 'Bolivia' },
  { code: 'PY', nombre: 'Paraguay' },
  { code: 'UY', nombre: 'Uruguay' },
  { code: 'PA', nombre: 'Panamá' },
  { code: 'CR', nombre: 'Costa Rica' },
  { code: 'GT', nombre: 'Guatemala' },
  { code: 'HN', nombre: 'Honduras' },
  { code: 'SV', nombre: 'El Salvador' },
  { code: 'NI', nombre: 'Nicaragua' },
  { code: 'DO', nombre: 'República Dominicana' },
  { code: 'CU', nombre: 'Cuba' },
  { code: 'PR', nombre: 'Puerto Rico' },
  { code: 'US', nombre: 'Estados Unidos' },
  { code: 'CA', nombre: 'Canadá' },
  { code: 'ES', nombre: 'España' },
  { code: 'PT', nombre: 'Portugal' },
  { code: 'FR', nombre: 'Francia' },
  { code: 'DE', nombre: 'Alemania' },
  { code: 'IT', nombre: 'Italia' },
  { code: 'GB', nombre: 'Reino Unido' },
  { code: 'NL', nombre: 'Países Bajos' },
  { code: 'BE', nombre: 'Bélgica' },
  { code: 'CH', nombre: 'Suiza' },
  { code: 'IE', nombre: 'Irlanda' },
  { code: 'SE', nombre: 'Suecia' },
  { code: 'NO', nombre: 'Noruega' },
  { code: 'DK', nombre: 'Dinamarca' },
  { code: 'FI', nombre: 'Finlandia' },
  { code: 'PL', nombre: 'Polonia' },
  { code: 'AT', nombre: 'Austria' },
  { code: 'GR', nombre: 'Grecia' },
  { code: 'BR', nombre: 'Brasil' },
  { code: 'JP', nombre: 'Japón' },
  { code: 'CN', nombre: 'China' },
  { code: 'KR', nombre: 'Corea del Sur' },
  { code: 'IN', nombre: 'India' },
  { code: 'AU', nombre: 'Australia' },
  { code: 'NZ', nombre: 'Nueva Zelanda' },
  { code: 'ZA', nombre: 'Sudáfrica' },
  { code: 'AE', nombre: 'Emiratos Árabes Unidos' },
  { code: 'IL', nombre: 'Israel' },
  { code: 'TR', nombre: 'Turquía' },
  { code: 'RU', nombre: 'Rusia' },
  { code: 'SG', nombre: 'Singapur' },
  { code: 'OTRO', nombre: 'Otro' },
];

/* Indicativos telefónicos, para el campo de teléfono del registro.

   Van aparte de PAISES porque no es la misma lista ni sirve para lo mismo:
   PAISES es "de dónde eres" y esto es "qué prefijo lleva tu número". Aquí
   solo están los países desde los que tiene sentido registrarse hoy, con
   Colombia primero por ser el mercado de partida.

   El nombre va abreviado a dos letras a propósito: el desplegable convive
   con el número en la misma fila y el país largo lo estrangulaba. */
export const INDICATIVOS = [
  { code: 'CO', dial: '+57',  nombre: 'Colombia' },
  { code: 'MX', dial: '+52',  nombre: 'México' },
  { code: 'AR', dial: '+54',  nombre: 'Argentina' },
  { code: 'CL', dial: '+56',  nombre: 'Chile' },
  { code: 'PE', dial: '+51',  nombre: 'Perú' },
  { code: 'EC', dial: '+593', nombre: 'Ecuador' },
  { code: 'VE', dial: '+58',  nombre: 'Venezuela' },
  { code: 'BO', dial: '+591', nombre: 'Bolivia' },
  { code: 'UY', dial: '+598', nombre: 'Uruguay' },
  { code: 'PY', dial: '+595', nombre: 'Paraguay' },
  { code: 'CR', dial: '+506', nombre: 'Costa Rica' },
  { code: 'PA', dial: '+507', nombre: 'Panamá' },
  { code: 'GT', dial: '+502', nombre: 'Guatemala' },
  { code: 'DO', dial: '+1',   nombre: 'Rep. Dominicana' },
  { code: 'ES', dial: '+34',  nombre: 'España' },
  { code: 'US', dial: '+1',   nombre: 'Estados Unidos' },
];
