interface Bucket {
  bucket: string;
  region: string;
}

const REGION_MATRIX: Record<string, string[]> = {
  "us-east-2": ["us-east-1"], // ohio
  "us-east-1": ["us-east-2"], // virginia
  "us-west-2": ["us-west-1"], // oregon
  "us-west-1": ["us-west-2"], // california
  "ap-south-1": ["ap-southeast-1"], // mumbai
  "ap-southeast-1": ["ap-southeast-2", "ap-northeast-1", "ap-northeast-2"], // singapore
  "ap-southeast-2": ["ap-southeast-1"], // sydney
  "ap-northeast-2": ["ap-northeast-1", "ap-southeast-1"], // seoul
  "ap-northeast-1": ["ap-northeast-2", "ap-southeast-1"], // tokyo
  "eu-central-1": ["eu-west-1", "eu-west-2"], // frankfurt
  "eu-west-1": ["eu-west-2", "eu-central-1"], // dublin
  "eu-west-2": ["eu-west-1", "eu-central-1"], // london
  "sa-east-1": ["us-east-1", "us-east-2"], // sao paulo
};

export const getRegion = (
  execRegion: string,
  primary: Bucket,
  replicas: Bucket[]
): Bucket => {
  if (primary.region === execRegion) {
    return primary;
  }

  for (const replica of replicas) {
    if (replica.region === execRegion) {
      return replica;
    }
  }

  if (execRegion in REGION_MATRIX) {
    for (const region of REGION_MATRIX[execRegion]) {
      for (const replica of replicas) {
        if (replica.region === region) {
          return replica;
        }
      }
    }
  }

  return primary;
};
