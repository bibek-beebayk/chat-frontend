# Complete Frontend Redesign Implementation Plan

This plan outlines the steps to overhaul the frontend to match the rich, dark-themed, 3-column dashboard layout shown in your reference images.

## Architecture & Layout

Currently, the app uses a relatively simple top-down layout structure. To support the complex dashboard UI, we need to introduce a dedicated `DashboardLayout` for authenticated routes.

1. **Global Theme Update** (`src/styles/globals.css`)
   - Update CSS variables to match the deep dark purple (`#0B0814` to `#161026`), violet highlights, and golden accent colors (`#FFD700`, `#FFA500`) seen in the mockups.
   - Introduce glassmorphism and soft shadow utility classes.

2. **Dashboard Layout Component** (`src/components/layout/DashboardLayout.tsx`)
   - Create a global wrapper for authenticated pages.
   - **Mobile First**: Default to a single column with a Top Header (Hamburger menu, search, profile) and the existing `MobileBottomNav`.
   - **Desktop**: Expand to a CSS Grid layout:
     - **Left Sidebar** (fixed, ~260px width)
     - **Main Content Area** (fluid, scrollable)
     - **Right Sidebar** (fixed, ~320px width) *Optional depending on the route*.

## Core Components to Build/Refactor

### 1. Left Sidebar Navigation (`Sidebar.tsx`)
- Contains links grouped by category (Community, Features, Support).
- Includes the "Create Post" prominent button.
- Bottom section for Dark Theme toggle and user footer.
- Hidden on mobile (accessible via hamburger menu drawer).

### 2. Header / TopNav (`TopNav.tsx`)
- Desktop: Minimal, showing search, notifications, and compact user profile.
- Mobile: Includes branding logo and hamburger menu toggle.

### 3. Home Page Refactor (`src/app/page.tsx`)
The home page will be the focal point of the redesign, split into the Center Feed and Right Sidebar.

#### Center Column
- **Hero Banner**: "WELCOME TO ROLLIN COMMUNITY" with the large golden 'R' shield, quick feature links, and "Join Chat" / "Play Demo" buttons.
- **Stats Grid**: 4 cards showing Community Members, Online Now, Weekly Rewards, and Upcoming Events. (2x2 grid on mobile, 1x4 row on desktop).
- **Community Feed**: Refactor `PostCard` to match the sleek dark card styling with badges (Admin, Pinned) and prominent image slots.

#### Right Column (`RightSidebar.tsx`)
- **Online Members**: List of avatars and levels.
- **Upcoming Events**: Vertical timeline list.
- **Recent Activity**: Mini feed of user actions.
- **Level Progress**: User XP bar and "Complete Profile" prompt.

## Implementation Steps

1. **Phase 1: Foundation & Theme**
   - Update `globals.css` with the new color palette, fonts, and layout grid variables.
2. **Phase 2: The Shell**
   - Build `Sidebar`, `TopNav`, and `RightSidebar` components.
   - Implement `DashboardLayout` and apply it to `src/app/page.tsx`.
3. **Phase 3: The Content**
   - Build `HeroBanner` and `StatsGrid` components.
   - Refactor `PostCard` to match the new dark aesthetic.
4. **Phase 4: Mobile Polish**
   - Ensure the CSS Grid perfectly collapses into a vertical stack for mobile devices.
   - Link the hamburger menu to a slide-out drawer for the Sidebar.

> [!WARNING] 
> **Image Assets:** The reference design features rich 3D assets (Golden R Shield, Treasure Chests, Slot Characters). I will use placeholder images or generate CSS-based approximations for these unless you have the exact asset files exported and ready to use in the `/public` directory. If you have them, I will point the `img` tags to them!

## User Review Required

Please review the plan above. 

**Open Questions:**
1. Does the Right Sidebar (Online Members, Events, Level) apply *only* to the Home page, or should it be visible on all dashboard pages (like `/chat`, `/rewards`, etc.) on desktop?
2. Shall I proceed with building this layout?
