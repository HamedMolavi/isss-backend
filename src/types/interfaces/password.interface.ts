export type Requirements = Array<{ re: RegExp, label: string }>;
export interface IValidatePassword {
  requirements: Requirements;
  
  getStrength: (password: string) => number
}
