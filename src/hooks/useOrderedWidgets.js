import useAppStore from '../store/useAppStore';

/** Enabled widget ids, in the user's chosen order. */
export function useOrderedWidgets() {
  const widgets = useAppStore((s) => s.widgets);
  return widgets.filter((w) => w.enabled).map((w) => w.id);
}
