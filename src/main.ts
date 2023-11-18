import inquirer, { QuestionCollection, ListQuestion, Question, DistinctQuestion, ChoiceCollection, ListChoiceMap, DistinctChoice, ListChoiceOptions } from 'inquirer'
import { generateUsers } from './generate_users'
import { MageClient, Role, UserCreateRequest } from './mage_client'


interface AppState {
  serverUrl?: string
  service?: MageClient
  event?: {
    id: number,
    name: string,
    [other: string]: any
  }
  roles?: Array<{
    id: string,
    name: string,
    description?: string,
    permissions: string[]
  }>
}

const prompt = inquirer.createPromptModule()

type RootActionChoices = {
  setUrl: typeof setUrlAction,
  signIn: typeof signInAction,
  setEvent: typeof setEventAction,
  generateUsers: typeof generateUsersAction,
  postLocation: typeof postLocationAction,
}

const rootActions: ListChoiceOptions<RootActionChoices>[] = [
  { name: 'setEvent', short: 'Set event', value: setEventAction },
  { name: 'generateUsers', short: 'Generate users', value: generateUsersAction },
  { name: 'postLocationAction', short: 'Post location', value: postLocationAction },
  { name: 'signIn', short: 'Sign in', value: signInAction },
  { name: 'setUrl', short: 'Set URL', value: setUrlAction },
]

async function rootMenu(state: AppState): Promise<void> {
  const choice = await prompt<{ action: RootActionChoices[keyof RootActionChoices] }>({ name: 'action', type: 'list', choices: rootActions })
  const stateAfter = await choice.action(state)
  rootMenu(stateAfter)
}

async function setUrlAction(state: AppState): Promise<AppState> {
  const answer = await prompt<{ url: string }>({ name: 'url', message: 'URL' })
  const service = new MageClient(answer.url)
  return { serverUrl: answer.url, service }
}

async function signInAction(state: AppState): Promise<AppState> {
  const service = state.service!
  const answers = await prompt<{ user: string, password: string, device: string }>([
    { name: 'user', message: 'User name' },
    { name: 'password', message: 'Password', type: 'password' },
    { name: 'deviceId', message: 'Device ID' },
  ])
  await service.signIn(answers.user, answers.password, answers.device)
  return state
}

async function generateUsersAction(state: AppState): Promise<AppState> {
  const howManyAnswer = await prompt<{ count: number }>({ name: 'count', message: 'How many?', type: 'number' })
  const { data: roles } = await state.service!.listRoles()
  const userRole = roles.find(x => x.name === 'USER_ROLE')!
  const users = await generateUsers(howManyAnswer.count, userRole.id)
  for (const rando of users) {
    console.log(rando)
  }
  return { ...state, roles }
}

async function setEventAction(state: AppState): Promise<AppState> {
  const service = state.service!
  const mageEvents: any[] = await service.listEvents()
  const mageEventChoices = mageEvents.map(x => {
    return { name: x.name, value: x.id, short: x.name }
  }).sort((a, b) => String(a.name).localeCompare(b.name))
  const { mageEventId } = await prompt<{ mageEventId: any }>({
    name: 'mageEventId',
    type: 'list',
    message: 'Which event?',
    choices: mageEventChoices
  })
  const event = await service.readEvent(mageEventId)
  return { ...state, event }
}

async function postLocationAction(state: AppState): Promise<AppState> {
  const coords = await prompt<{ lon: number, lat: number }>([
    { name: 'lon', message: 'Longitude', filter: parseFloat },
    { name: 'lat', message: 'Latitude', filter: parseFloat }
  ])
  const { service, event } = state as Required<AppState>
  const res = await service.postUserLocation(event.id, coords.lon, coords.lat)
  console.log(res)
  return state
}

setUrlAction({} as AppState).then(signInAction).then(rootMenu)
