export type WebsiteValueCandidate = {
  _id?: unknown;
  no: number;
  maker: string;
  model: string;
  vehicleModel: string;
  vehicleGrade: string;
  aliases: string[];
  drivetrain: '2WD' | '4WD';
  modelCodes: string[];
  price: number;
  taxIncluded: boolean;
  consumptionTaxRate: number;
  customsDepreciationRate: number;
  sourceUrl: string;
  effectiveFrom?: string;
};

export type WebsiteValueCarIdentity = {
  title?: string;
  maker?: string;
  model?: string;
  modelCode?: string;
  vehicleGrade?: string;
  chassisCode?: string;
  features?: string[];
};

export function selectWebsiteValueForCar(
  records: WebsiteValueCandidate[],
  car: WebsiteValueCarIdentity,
): WebsiteValueCandidate | undefined {
  const maker = normalize(car.maker);
  const model = normalize(car.model);
  const identity = normalize(
    [
      car.title,
      car.vehicleGrade,
      car.modelCode,
      car.chassisCode,
      ...(car.features ?? []),
    ]
      .filter(Boolean)
      .join(' '),
  );
  const drivetrain = inferDrivetrain(identity);

  const ranked = records
    .filter(
      (record) =>
        normalize(record.maker) === maker && normalize(record.model) === model,
    )
    .map((record) => ({
      record,
      score: matchScore(record, identity, drivetrain),
    }))
    .filter(({ score }) => score >= 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.record.no - right.record.no,
    );

  if (!ranked.length) return undefined;
  if (
    ranked[1] &&
    ranked[0].score === ranked[1].score &&
    (ranked[0].record.price !== ranked[1].record.price ||
      ranked[0].record.drivetrain !== ranked[1].record.drivetrain)
  ) {
    return undefined;
  }
  return ranked[0].record;
}

function matchScore(
  record: WebsiteValueCandidate,
  identity: string,
  drivetrain: '2WD' | '4WD' | undefined,
) {
  if (drivetrain && record.drivetrain !== drivetrain) return -1;

  const aliasScore = Math.max(
    -1,
    ...record.aliases.map((alias) => {
      const normalizedAlias = normalize(alias);
      return containsPhrase(identity, normalizedAlias)
        ? normalizedAlias.split(' ').length * 100 + normalizedAlias.length
        : -1;
    }),
  );
  if (aliasScore < 0) return -1;

  const exactCode = record.modelCodes.some((code) =>
    containsPhrase(identity, normalize(code)),
  );
  const codePrefix = record.modelCodes.some((code) => {
    const [prefix] = normalize(code).split(' ');
    return prefix ? containsPhrase(identity, prefix) : false;
  });

  return (
    aliasScore + (drivetrain ? 50 : 0) + (exactCode ? 500 : codePrefix ? 20 : 0)
  );
}

function inferDrivetrain(identity: string): '2WD' | '4WD' | undefined {
  if (
    containsPhrase(identity, '4WD') ||
    containsPhrase(identity, 'AWD') ||
    containsPhrase(identity, 'M910A')
  ) {
    return '4WD';
  }
  if (containsPhrase(identity, '2WD') || containsPhrase(identity, 'M900A')) {
    return '2WD';
  }
  return undefined;
}

function containsPhrase(identity: string, phrase: string) {
  return ` ${identity} `.includes(` ${phrase} `);
}

function normalize(value?: string) {
  return (value ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}
