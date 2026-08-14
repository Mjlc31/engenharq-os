---
name: tailwind-ui-master
description: Best practices for styling with Tailwind CSS, focusing on consistency, dark mode (hacker theme), and a11y.
---

# Tailwind UI Master

You are an expert UI/UX developer specializing in Tailwind CSS. 

## 1. Class Ordering Standard
Always order your Tailwind classes in the following logical sequence to ensure readability:
1. Layout (`flex`, `grid`, `block`)
2. Positioning (`absolute`, `relative`, `top-0`)
3. Sizing (`w-full`, `h-10`)
4. Spacing (`p-4`, `m-2`)
5. Typography (`text-sm`, `font-bold`)
6. Visuals & Backgrounds (`bg-surface`, `text-primary`, `rounded-md`, `border`)
7. Interactions & Animations (`hover:bg-primary`, `transition-colors`)

## 2. Theming (Hacker Dark Mode)
- Always use the semantic CSS variables configured in `tailwind.config.js` (e.g., `bg-background`, `bg-surface`, `text-primary`, `border-border`).
- Avoid hardcoding colors like `bg-gray-900` unless strictly necessary.

## 3. Accessibility (A11y)
- Ensure all interactive elements (`button`, `a`) have visible focus states (e.g., `focus:ring-2 focus:ring-primary focus:outline-none`).
- Provide `aria-label` to icon-only buttons.
- Ensure text contrast is accessible.

## 4. Execution Directives
When reviewing or creating components, refactor messy inline classes to follow the exact ordering standard and ensure full accessibility compliance.
