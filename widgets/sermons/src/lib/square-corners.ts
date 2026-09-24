/**
 * Zeroes the theme's radius tokens for everything inside, so a filter bar
 * (search, dropdowns and their menus, date picker, chips, Clear All) draws the
 * square corners of perimeter.org's own controls. Every `rounded-*` utility
 * reads one of these variables, so this squares the shared `@perimeter/ui`
 * controls without forking them; `rounded-full` isn't a token and stays round.
 */
export const SQUARE_CORNERS =
  '[--radius-sm:0px] [--radius-md:0px] [--radius-lg:0px] [--radius-xl:0px] [--radius-4xl:0px]';
