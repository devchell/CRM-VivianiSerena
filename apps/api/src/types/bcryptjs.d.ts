declare module 'bcryptjs' {
  interface Bcryptjs {
    hash(value: string, saltOrRounds: string | number): Promise<string>
    compare(value: string, encrypted: string): Promise<boolean>
  }

  const bcrypt: Bcryptjs
  export default bcrypt
}
