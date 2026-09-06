import { Icon24SearchOutline } from '@vkontakte/icons'
import { Search } from '@vkontakte/vkui'
import { useSearchBox } from '../model/useSearchBox'

export function SearchBox() {
  const { value, onChange, onKeyDown } = useSearchBox()

  return (
    <Search
      placeholder="Поиск"
      icon={<Icon24SearchOutline />}
      iconLabel="Найти"
      clearLabel="Очистить запрос"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  )
}
