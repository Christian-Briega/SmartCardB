export const formatPersonName = (value: string): string => {
  // Permite apenas letras (incluindo acentuadas) e espaços
  const lettersAndSpacesOnly = value
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+/, '');

  return lettersAndSpacesOnly.replace(/\S+/g, (word) => {
    const [firstCharacter, ...remainingCharacters] = Array.from(word);
    return (
      firstCharacter.toLocaleUpperCase('pt-BR') +
      remainingCharacters.join('').toLocaleLowerCase('pt-BR')
    );
  });
};
