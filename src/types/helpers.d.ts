type Simplify<T> = T extends infer S ? { [K in keyof S]: S[K] } : never;
type NoneOf<T> = Simplify<{ [K in keyof T]?: never }>;
type AtMostOneOf<T> = NoneOf<T> | { [K in keyof T]: Simplify<Pick<T, K> & NoneOf<Omit<T, K>>> }[keyof T];
type ExactlyOneOf<T> = { [K in keyof T]: Simplify<Pick<T, K> & NoneOf<Omit<T, K>>> }[keyof T];
