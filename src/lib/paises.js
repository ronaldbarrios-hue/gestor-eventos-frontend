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
