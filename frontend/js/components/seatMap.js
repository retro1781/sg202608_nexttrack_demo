// 좌석 배치도 HTML 생성 (좌2 · 통로 · 우2). 클릭 와이어링은 호출 페이지에서.
export function seatRowsHTML(route, selectedSeat) {
  const booked = new Set(route.booked);
  const cell = (n) => {
    const taken = booked.has(n);
    const sel = selectedSeat === n;
    const cls = taken ? "taken" : sel ? "sel" : "avail";
    return `<div class="seat ${cls}" data-seat="${n}">${n}</div>`;
  };
  return (route.layout || []).map((row) =>
    `<div class="seat-row">${row.left.map(cell).join("")}<div class="aisle"></div>${row.right.map(cell).join("")}</div>`
  ).join("");
}
