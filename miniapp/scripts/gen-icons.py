import os
base = r'Y:\AI\WX-APP-OA\miniapp\src\static\icons'

icons = {}

# ---- tab-bar icons (active + inactive) ----
icons['tab-home.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M14 3L3 13h3v11h5v-7h6v7h5V13h3L14 3z" stroke="#B0B0B0" stroke-width="2" fill="none" stroke-linejoin="round"/><rect x="11" y="17" width="6" height="7" rx="1" fill="#B0B0B0" fill-opacity="0.15" stroke="#B0B0B0" stroke-width="2"/></svg>'
icons['tab-home-active.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M14 3L3 13h3v11h5v-7h6v7h5V13h3L14 3z" stroke="#2B6DE8" stroke-width="2" fill="none" stroke-linejoin="round"/><rect x="11" y="17" width="6" height="7" rx="1" fill="#2B6DE8" fill-opacity="0.2" stroke="#2B6DE8" stroke-width="2"/></svg>'
icons['tab-features.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="3" y="3" width="9" height="9" rx="2" fill="#B0B0B0" opacity="0.3"/><rect x="16" y="3" width="9" height="9" rx="2" fill="#B0B0B0" opacity="0.3"/><rect x="3" y="16" width="9" height="9" rx="2" fill="#B0B0B0" opacity="0.3"/><rect x="16" y="16" width="9" height="9" rx="2" fill="#B0B0B0" opacity="0.3"/></svg>'
icons['tab-features-active.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="3" y="3" width="9" height="9" rx="2" fill="#2B6DE8"/><rect x="16" y="3" width="9" height="9" rx="2" fill="#2B6DE8"/><rect x="3" y="16" width="9" height="9" rx="2" fill="#2B6DE8"/><rect x="16" y="16" width="9" height="9" rx="2" fill="#2B6DE8"/></svg>'
icons['tab-profile.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="9" r="5" fill="#B0B0B0" fill-opacity="0.15" stroke="#B0B0B0" stroke-width="2"/><path d="M4 26c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="none" stroke="#B0B0B0" stroke-width="2" stroke-linecap="round"/></svg>'
icons['tab-profile-active.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="9" r="5" fill="#2B6DE8" fill-opacity="0.2" stroke="#2B6DE8" stroke-width="2"/><path d="M4 26c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="none" stroke="#2B6DE8" stroke-width="2" stroke-linecap="round"/></svg>'

# ---- home quick actions (fixed colors) ----
icons['quick-clipboard.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#2B6DE8" stroke-width="2" fill="none"/><line x1="8" y1="7" x2="16" y2="7" stroke="#2B6DE8" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="11" x2="16" y2="11" stroke="#2B6DE8" stroke-width="2" stroke-linecap="round"/><polyline points="8,15 11,18 16,13" stroke="#2B6DE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
icons['quick-document.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" stroke="#22C55E" stroke-width="2" fill="none"/><line x1="8" y1="7" x2="16" y2="7" stroke="#22C55E" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="11" x2="14" y2="11" stroke="#22C55E" stroke-width="2" stroke-linecap="round"/><polyline points="8,15 10,17 13,13" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
icons['quick-bell.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
icons['quick-check.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#2B6DE8" stroke-width="2" fill="none"/><polyline points="7,12 10.5,15.5 17,9" stroke="#2B6DE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'

# ---- features page icons (12 total) ----
feat_icons = {
    'feat-clipboard': ('#2B6DE8', '<rect x="4" y="3" width="16" height="18" rx="2" stroke="C" stroke-width="2" fill="none"/><polyline points="8,10 11,13 16,8" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'feat-document': ('#22C55E', '<rect x="5" y="2" width="14" height="20" rx="2" stroke="C" stroke-width="2" fill="none"/><line x1="8" y1="7" x2="16" y2="7" stroke="C" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="11" x2="14" y2="11" stroke="C" stroke-width="2" stroke-linecap="round"/><polyline points="8,15 10,17 13,13" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'feat-folder': ('#2B6DE8', '<path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" stroke="C" stroke-width="2" fill="none"/>'),
    'feat-cart': ('#EF4444', '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="3" y1="6" x2="21" y2="6" stroke="C" stroke-width="2"/><path d="M16 10a4 4 0 0 1-8 0" stroke="C" stroke-width="2" stroke-linecap="round" fill="none"/>'),
    'feat-bell': ('#6366F1', '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'feat-chart': ('#F59E0B', '<line x1="18" y1="20" x2="18" y2="10" stroke="C" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="C" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="C" stroke-width="2" stroke-linecap="round"/>'),
    'feat-users': ('#2B6DE8', '<circle cx="9" cy="7" r="4" stroke="C" stroke-width="2" fill="none"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="C" stroke-width="2" stroke-linecap="round" fill="none"/><line x1="16" y1="3.13" x2="16" y2="3.13" stroke="C" stroke-width="3" stroke-linecap="round"/><path d="M19 13.74V21h-4v-2a4 4 0 0 0-1-2.8" stroke="C" stroke-width="2" stroke-linecap="round" fill="none"/>'),
    'feat-book': ('#22C55E', '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="C" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'feat-gear': ('#6366F1', '<circle cx="12" cy="12" r="3" stroke="C" stroke-width="2" fill="none"/><path d="M19.4 15a9.3 9.3 0 0 1-2.2 2.2l2.88 2.88-2.46 2.46-2.88-2.88a9.3 9.3 0 0 1-2.74.74L12 22h-4l-.86-2.26a9.3 9.3 0 0 1-2.74-.74L2.46 21.4 0 18.94l2.88-2.88A9.3 9.3 0 0 1 2.14 12L0 9.86 2.46 7.4 5.34 10.28A9.3 9.3 0 0 1 8.14 8.48L9 6h4l.86 2.48a9.3 9.3 0 0 1 2.8.8l2.88-2.88L21.4 7.4 18.52 10.28a9.3 9.3 0 0 1 .88 1.72L22 13.86v4.28L19.4 15z" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'feat-shield': ('#EF4444', '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="9,12 11,14 15,10" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'feat-clock': ('#999999', '<circle cx="12" cy="12" r="10" stroke="C" stroke-width="2" fill="none"/><polyline points="12,6 12,12 16,14" stroke="C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'feat-grid': ('#999999', '<circle cx="5" cy="5" r="2" fill="C"/><circle cx="12" cy="5" r="2" fill="C"/><circle cx="19" cy="5" r="2" fill="C"/><circle cx="5" cy="12" r="2" fill="C"/><circle cx="12" cy="12" r="2" fill="C"/><circle cx="19" cy="12" r="2" fill="C"/><circle cx="5" cy="19" r="2" fill="C"/><circle cx="12" cy="19" r="2" fill="C"/><circle cx="19" cy="19" r="2" fill="C"/>'),
}
for name, (color, shapes) in feat_icons.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">{shapes.replace("C", color)}</svg>'
    icons[f'{name}.svg'] = svg

# ---- profile settings icons ----
set_icons = {
    'set-notification': ('#6366F1', '<path d="M15 6.5A5.5 5.5 0 0 0 4 6.5C4 12 1.5 13.5 1.5 13.5h16S15 12 15 6.5z" stroke="C" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M11.5 17a1.5 1.5 0 0 1-3 0" stroke="C" stroke-width="1.5" fill="none"/>'),
    'set-shield': ('#EF4444', '<path d="M10 18s-7-3.5-7-8.5V4l7-2.5L17 4v5.5c0 5-7 8.5-7 8.5z" stroke="C" stroke-width="1.5" stroke-linejoin="round" fill="none"/><polyline points="7,10 9,12 13,8" stroke="C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'),
    'set-help': ('#22C55E', '<circle cx="10" cy="10" r="8.5" stroke="C" stroke-width="1.5" fill="none"/><path d="M7.5 8a3 3 0 0 1 5.2-1.5" stroke="C" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="10" cy="14.5" r="1" fill="C"/>'),
    'set-info': ('#999999', '<circle cx="10" cy="10" r="8.5" stroke="C" stroke-width="1.5" fill="none"/><line x1="10" y1="10" x2="10" y2="14" stroke="C" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="6.5" r="1" fill="C"/>'),
    'set-person': ('#2B6DE8', '<circle cx="10" cy="6" r="3.5" stroke="C" stroke-width="1.5" fill="none"/><path d="M2.5 18c0-4 3.5-7 7.5-7s7.5 3 7.5 7" stroke="C" stroke-width="1.5" stroke-linecap="round" fill="none"/>'),
}
for name, (color, shapes) in set_icons.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">{shapes.replace("C", color)}</svg>'
    icons[f'{name}.svg'] = svg

# Write all files
for name, svg in icons.items():
    path = os.path.join(base, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(svg)
    size = os.path.getsize(path)
    print(f'OK  {size:>5}B  {name}')

print(f'\nTotal: {len(icons)} icons created')
