import type { ComponentPropsWithRef } from 'react'
import { NavLink, Link as RouterLink } from 'react-router'

/**
 * VKUI-компоненты (`SimpleCell`, `Link`, …) отдают в `Component` только
 * DOM-пропсы ссылки, а адрес приходит в `href`; react-router ждёт `to`.
 * Эти обёртки переводят одно в другое.
 *
 * `href` (а не `to`) заодно включает в `Clickable` состояния hover/active —
 * с одним лишь `Component` VKUI считает ячейку некликабельной.
 *
 * Объявлены на уровне модуля: инлайновая стрелка в `Component` создавала бы
 * новый тип элемента на каждый рендер и перемонтировала поддерево.
 */
type AnchorProps = ComponentPropsWithRef<'a'>

export function RouterAnchor({ href = '', ...props }: AnchorProps) {
  return <RouterLink {...props} to={href} />
}

export function NavAnchor({ href = '', className = '', style = {}, ...props }: AnchorProps) {
  // `className`/`style` у NavLink могут быть функциями, поэтому под
  // exactOptionalPropertyTypes им нужно значение, а не undefined.
  return <NavLink {...props} className={className} style={style} to={href} />
}
