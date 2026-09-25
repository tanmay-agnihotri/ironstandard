export function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}
export function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('save failed', e);
  }
}

export const LS_PROFILE = 'iron_profile';
export const LS_PROGRAM = 'iron_program';
export const LS_CHECKINS = 'iron_checkins_v2';
export const LS_LIFTCHECKS = 'iron_liftchecks';
export const LS_TRAINLOGS = 'iron_trainlogs';
export const LS_MEALPLAN = 'iron_mealplan';
export const LS_DIETLOG = 'iron_dietlog';
export const LS_CHEATMEALS = 'iron_cheatmeals';
