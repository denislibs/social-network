import {
  Button,
  DateInput,
  FormItem,
  FormLayoutGroup,
  Input,
  Select,
  Textarea,
} from '@vkontakte/vkui'
import type { ProfileDto } from '@/entities/user'
import { CITIES } from '@/shared/config'
import { formatBirthday, parseBirthday } from '../model/birthday'
import { type ProfileFormField, useEditProfileForm } from '../model/useEditProfileForm'

const CITY_OPTIONS = CITIES.map((city) => ({ value: city, label: city }))

export function EditProfileForm({ profile }: { profile: ProfileDto }) {
  const f = useEditProfileForm(profile)

  const status = (field: ProfileFormField) => (f.errors[field] ? 'error' : 'default')
  const bottom = (field: ProfileFormField) => f.errors[field]
  const describedBy = (field: ProfileFormField, id: string) => (f.errors[field] ? id : undefined)

  return (
    <form onSubmit={f.submit} noValidate>
      <FormLayoutGroup mode="vertical">
        <FormItem
          htmlFor="edit-status"
          top="Статус"
          status={status('status')}
          bottom={bottom('status')}
          bottomId="edit-status-error"
        >
          <Input
            id="edit-status"
            name="status"
            maxLength={140}
            value={f.values.status}
            onChange={(e) => f.setField('status', e.target.value)}
            disabled={f.busy}
            slotProps={{
              input: {
                'aria-describedby': describedBy('status', 'edit-status-error'),
                'aria-invalid': Boolean(f.errors.status),
              },
            }}
          />
        </FormItem>
        <FormItem
          htmlFor="edit-bio"
          top="О себе"
          status={status('bio')}
          bottom={bottom('bio')}
          bottomId="edit-bio-error"
        >
          <Textarea
            id="edit-bio"
            name="bio"
            maxLength={2000}
            value={f.values.bio}
            onChange={(e) => f.setField('bio', e.target.value)}
            disabled={f.busy}
            slotProps={{
              textArea: {
                'aria-describedby': describedBy('bio', 'edit-bio-error'),
                'aria-invalid': Boolean(f.errors.bio),
              },
            }}
          />
        </FormItem>
        <FormItem htmlFor="edit-city" top="Город">
          <Select
            id="edit-city"
            name="city"
            placeholder="Не указан"
            options={CITY_OPTIONS}
            value={f.values.city}
            onChange={(_e, value) => f.setField('city', value == null ? '' : String(value))}
            disabled={f.busy}
          />
        </FormItem>
        <FormItem htmlFor="edit-birthday" top="Дата рождения">
          <DateInput
            id="edit-birthday"
            value={parseBirthday(f.values.birthday)}
            onChange={(date) => f.setField('birthday', formatBirthday(date))}
            disabled={f.busy}
          />
        </FormItem>
        <FormItem
          htmlFor="edit-screen-name"
          top="Короткое имя"
          status={status('screenName')}
          bottom={bottom('screenName')}
          bottomId="edit-screen-name-error"
        >
          <Input
            id="edit-screen-name"
            name="screenName"
            before="vkc.local/"
            value={f.values.screenName}
            onChange={(e) => f.setField('screenName', e.target.value)}
            disabled={f.busy}
            slotProps={{
              input: {
                'aria-describedby': describedBy('screenName', 'edit-screen-name-error'),
                'aria-invalid': Boolean(f.errors.screenName),
              },
            }}
          />
        </FormItem>
        <FormItem
          status={f.formError ? 'error' : 'default'}
          bottom={f.formError ?? undefined}
          bottomId="edit-form-error"
        >
          <Button type="submit" size="l" stretched mode="primary" loading={f.busy}>
            Сохранить
          </Button>
        </FormItem>
      </FormLayoutGroup>
    </form>
  )
}
