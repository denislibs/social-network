import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Проект на старте: у многих слайсов одна ссылка (например, features/theme используется только в app-shell).
    // Включить обратно в подсистеме 2, когда появятся лента/профиль.
    rules: { 'fsd/insignificant-slice': 'off' },
  },
])
