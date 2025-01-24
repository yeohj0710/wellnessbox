const KEY = 123456;

export function generateOrderNumber(id: number): string {
  const a = 15485863;
  const b = KEY % 1000000;
  const m = 1000000;

  const hashed = (id * a + b) % m;

  return hashed.toString().padStart(6, "0");
}

export function reverseOrderNumber(encoded: string): number {
  const a = 15485863;
  const b = KEY % 1000000;
  const m = 1000000;
  const aInv = modInverse(a, m);

  const numericEncoded = parseInt(encoded, 10);

  const original = ((numericEncoded - b) * aInv) % m;

  return (original + m) % m;
}

function modInverse(a: number, m: number): number {
  let m0 = m,
    t,
    q;
  let x0 = 0,
    x1 = 1;

  if (m === 1) return 0;

  while (a > 1) {
    q = Math.floor(a / m);
    t = m;
    m = a % m;
    a = t;
    t = x0;
    x0 = x1 - q * x0;
    x1 = t;
  }

  if (x1 < 0) x1 += m0;
  return x1;
}
