export function calculateMEWS(hr, rr, sbp, bt) {
  let score = 0;
  if (hr <= 40 || hr >= 130) score += 3;
  else if (hr >= 111 || hr <= 50) score += 2;
  else if (hr >= 101 || hr <= 41) score += 1;
  if (rr >= 30 || rr < 9) score += 3;
  else if (rr >= 21 || rr <= 14) score += 2;
  const bpValue = parseInt(sbp);
  if (bpValue <= 70) score += 3;
  else if (bpValue <= 80 || bpValue >= 200) score += 2;
  else if (bpValue <= 100) score += 1;
  const temp = parseFloat(bt);
  if (temp < 35 || temp >= 38.5) score += 2;
  return score;
}
