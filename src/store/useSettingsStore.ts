import { create } from 'zustand';

interface SettingsState {
  defaultProvinceCode: string | null;
  setDefaultProvinceCode: (code: string | null) => void;
}

const useSettingsStore = create<SettingsState>((set) => ({
  defaultProvinceCode: null,
  setDefaultProvinceCode: (code) => set({ defaultProvinceCode: code }),
}));

export default useSettingsStore;
