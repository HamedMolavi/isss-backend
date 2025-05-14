import { IValidatePassword, Requirements } from "../types/interfaces/password.interface";

export class ValidatePassword implements IValidatePassword {
  requirements: Requirements;

  constructor(requirementsSchema: Requirements) {
    this.requirements = requirementsSchema
  }
  // strength password verify
  getStrength(password: string): number {
    let multiplier = password.length > 5 ? 0 : 1;

    this.requirements.forEach((requirement) => {
      if (!requirement.re.test(password)) {
        multiplier += 1;
      }
    });

    return Math.max(100 - (100 / (this.requirements.length + 1)) * multiplier, 0);
  };
};

