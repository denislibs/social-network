import { TOPICS } from '@vkc/contracts'
import {
  Button,
  FormItem,
  FormLayoutGroup,
  Input,
  ModalPage,
  ModalPageHeader,
  ModalRoot,
  PanelHeaderClose,
  Select,
  Textarea,
} from '@vkontakte/vkui'
import type { CommunityDto } from '@/entities/community'
import { topicLabel } from '@/shared/lib'
import { type CommunityFormField, useCreateCommunityForm } from '../model/useCreateCommunityForm'

const TOPIC_OPTIONS = TOPICS.map((topic) => ({ value: topic, label: topicLabel(topic) }))
const MODAL_ID = 'create-community'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (c: CommunityDto) => void
}

export function CreateCommunityModal({ open, onClose, onCreated }: Props) {
  const f = useCreateCommunityForm((created) => {
    onCreated(created)
    onClose()
  })

  const status = (field: CommunityFormField) => (f.errors[field] ? 'error' : 'default')
  const bottom = (field: CommunityFormField) => f.errors[field]
  const describedBy = (field: CommunityFormField, id: string) => (f.errors[field] ? id : undefined)

  return (
    <ModalRoot activeModal={open ? MODAL_ID : null} onClose={onClose}>
      <ModalPage
        id={MODAL_ID}
        onClose={onClose}
        header={
          <ModalPageHeader before={<PanelHeaderClose onClick={onClose} />}>
            Новое сообщество
          </ModalPageHeader>
        }
      >
        <form onSubmit={f.submit} noValidate>
          <FormLayoutGroup mode="vertical">
            <FormItem
              htmlFor="community-name"
              top="Название"
              status={status('name')}
              bottom={bottom('name')}
              bottomId="community-name-error"
            >
              <Input
                id="community-name"
                name="name"
                value={f.values.name}
                onChange={(e) => f.setField('name', e.target.value)}
                disabled={f.busy}
                slotProps={{
                  input: {
                    'aria-describedby': describedBy('name', 'community-name-error'),
                    'aria-invalid': Boolean(f.errors.name),
                  },
                }}
              />
            </FormItem>
            <FormItem
              htmlFor="community-screen-name"
              top="Короткое имя"
              status={status('screenName')}
              bottom={bottom('screenName')}
              bottomId="community-screen-name-error"
            >
              <Input
                id="community-screen-name"
                name="screenName"
                before="vkc.local/"
                value={f.values.screenName}
                onChange={(e) => f.setField('screenName', e.target.value)}
                disabled={f.busy}
                slotProps={{
                  input: {
                    'aria-describedby': describedBy('screenName', 'community-screen-name-error'),
                    'aria-invalid': Boolean(f.errors.screenName),
                  },
                }}
              />
            </FormItem>
            <FormItem htmlFor="community-topic" top="Тема">
              <Select
                id="community-topic"
                name="topic"
                options={TOPIC_OPTIONS}
                value={f.values.topic}
                onChange={(_e, value) => f.setField('topic', value == null ? '' : String(value))}
                disabled={f.busy}
              />
            </FormItem>
            <FormItem htmlFor="community-description" top="Описание">
              <Textarea
                id="community-description"
                name="description"
                value={f.values.description}
                onChange={(e) => f.setField('description', e.target.value)}
                disabled={f.busy}
              />
            </FormItem>
            <FormItem
              status={f.formError ? 'error' : 'default'}
              bottom={f.formError ?? undefined}
              bottomId="community-form-error"
            >
              <Button type="submit" size="l" stretched mode="primary" loading={f.busy}>
                Создать
              </Button>
            </FormItem>
          </FormLayoutGroup>
        </form>
      </ModalPage>
    </ModalRoot>
  )
}
