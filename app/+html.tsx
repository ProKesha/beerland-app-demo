import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { colors, layout } from '@/theme/tokens';
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="uk">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#FAF6F0" />
        <ScrollViewStyleReset />
        <style>{`
          html, body, #root {
            height: 100%;
            height: 100dvh;
            min-height: 100%;
            min-height: 100dvh;
          }
          input:focus, textarea:focus {
            outline: none;
            box-shadow: none;
            caret-color: ${colors.textPrimary};
          }
          input::selection, textarea::selection {
            background-color: ${colors.amberTint};
            color: ${colors.textPrimary};
          }
          :is(button, [role="button"], [role="checkbox"]):focus:not(:focus-visible) {
            outline: none;
          }
          :is(button, [role="button"], [role="checkbox"]):focus-visible {
            outline: ${layout.focusWidth}px solid ${colors.primary};
            outline-offset: ${layout.focusOffset}px;
          }
          @media (hover: hover) {
            [data-testid="shop-chrome"] [role="button"] {
              transition: opacity 150ms ease;
            }
            [data-testid="shop-chrome"] [role="button"]:hover {
              opacity: 0.88;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-testid="shop-chrome"] [role="button"] {
              transition: none;
            }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
