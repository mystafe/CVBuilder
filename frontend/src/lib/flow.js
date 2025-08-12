const ORDER = [
  'source',
  'parse',
  'typeDetect',
  'followups',
  'assessSkills',
  'assessSector',
  'polish',
  'render',
];

export function createFlow(initial = 'source') {
  let index = Math.max(0, ORDER.indexOf(initial));

  return {
    get: () => ORDER[index],
    next: () => {
      if (index < ORDER.length - 1) index += 1;
      return ORDER[index];
    },
    prev: () => {
      if (index > 0) index -= 1;
      return ORDER[index];
    },
    canProceed: () => index < ORDER.length - 1,
    reset: () => {
      index = 0;
      return ORDER[index];
    },
  };
}


