// Keyboard and mouse state. The world reads a plain snapshot each step:
// movement axes, sneak held, and one-shot actions (coin throw, EMP, pause).
export function makeInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let clickPoint = null;

  const onKeyDown = (event) => {
    const tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const key = event.key.toLowerCase();
    if (!keys.has(key)) pressed.add(key);
    keys.add(key);
    if (key.startsWith('arrow') || key === ' ') event.preventDefault();
  };
  const onKeyUp = (event) => keys.delete(event.key.toLowerCase());
  const onBlur = () => { keys.clear(); pressed.clear(); };
  const onClick = (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    clickPoint = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onClick);

  return {
    snapshot() {
      const left = keys.has('a') || keys.has('arrowleft');
      const right = keys.has('d') || keys.has('arrowright');
      const up = keys.has('w') || keys.has('arrowup');
      const down = keys.has('s') || keys.has('arrowdown');
      const snap = {
        mx: (right ? 1 : 0) - (left ? 1 : 0),
        my: (down ? 1 : 0) - (up ? 1 : 0),
        sneak: keys.has('shift'),
        emp: pressed.has('e') || pressed.has(' '),
        pause: pressed.has('p') || pressed.has('escape'),
        confirm: pressed.has('enter') || pressed.has(' '),
        click: clickPoint,
      };
      pressed.clear();
      clickPoint = null;
      return snap;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousedown', onClick);
    },
  };
}
