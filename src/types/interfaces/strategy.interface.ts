export interface IFailoverStrategy {
    args: { [key: string]: any[] | any }
    strategies: ((...args: any[]) => any)[]
    do: () => any
}