import inquirer, { QuestionCollection, PromptModule, DistinctChoice, ListQuestion } from 'inquirer'
import axios, { AxiosInstance } from 'axios'

let mageUrl = process.env.MAGE_URL as string | undefined

const mageCli = inquirer.createPromptModule()

;(async () => {
  if (!mageUrl) {
    const { mageUrl: userMageUrl } = await mageCli<{ mageUrl: string }>(
      [
        { name: 'mageUrl' }
      ]
    )
    mageUrl = userMageUrl
  }
  const { user, password, device } = await mageCli<{ user: string, password: string, device: string }>(
    [
      {
        name: 'user'
      },
      {
        name: 'password',
        type: 'password'
      },
      {
        name: 'device'
      }
    ]
  )

  const mageService = new MageService(mageUrl)
  await mageService.signIn(user, password, device)

  const mageEvents: any[] = await mageService.listEvents()
  const mageEventChoices = mageEvents.map(x => {
    return { name: x.name, value: x.id, short: x.name }
  }).sort((a, b) => String(a.name).localeCompare(b.name))
  const { mageEventId } = await mageCli<{ mageEventId: any }>({
    name: 'mageEventId',
    type: 'list',
    message: 'Which event?',
    choices: mageEventChoices
  })

  await mageService.useEvent(mageEventId)

  const updateLocationQuestions: QuestionCollection<{ lon: number, lat: number }> = [
    { name: 'lon', message: 'Longitude', filter: parseFloat },
    { name: 'lat', message: 'Latitude', filter: parseFloat }
  ]
  const updateLocation = async () => {
    const coords = await mageCli<{ lon: number, lat: number }>(updateLocationQuestions)
    const res = await mageService.postUserLocation(coords.lon, coords.lat)
    console.log(res)
  }

  const promptAfter = (action: () => Promise<any>) => () => action().then(() => mageCli(eventActionsQuestions))
  const eventActionsQuestions: ListQuestion<() => any> = {
    name: 'eventAction',
    type: 'list',
    message: 'Choose an event action',
    choices: [
      { value: promptAfter(updateLocation), name: 'Update your location' },
      { value: async () => 0, name: 'Enough now' }
    ],
    filter: (executeChoice: () => any) => {
      setTimeout(executeChoice)
      return true
    }
  }
  mageCli(eventActionsQuestions)
})()


class MageService {

  readonly http: AxiosInstance
  accessToken: string | null = null
  user: any = null
  mageEvent: any = null

  get authHeader(): { authorization: string } {
    return {
      authorization: `bearer ${this.accessToken}`
    }
  }

  constructor(readonly mageUrl: string) {
    this.http = axios.create({
      baseURL: mageUrl
    })
  }

  async signIn(username: string, password: string, device: string): Promise<any> {
    let res = await this.http.post('/auth/local/signin', {
      username, password
    })
    this.user = res.data.user
    const signInToken = res.data.token
    res = await this.http.post('/auth/local/authorize',
      {
        uid: device
      }, {
        headers: {
          authorization: `bearer ${signInToken}`
        }
      })
    this.accessToken = res.data.token
    console.log(res)
  }

  async listEvents(): Promise<any> {
    const res = await this.http.get('/api/events', {
      headers: this.authHeader
    })
    return res.data
  }

  async useEvent(mageEventId: number) {
    const res = await this.http.get(`/api/events/${mageEventId}`, {
      headers: this.authHeader
    })
    this.mageEvent = res.data
    console.log('switched to event', this.mageEvent)
  }

  async postUserLocation(lon: number, lat: number): Promise<any> {
    const res = await this.http.post(`/api/events/${this.mageEvent?.id}/locations`,
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [ lon, lat ]
        },
        properties: {
          timestamp: new Date().toISOString(),
          accuracy: 1
        }
      },
      {
        headers: this.authHeader
      }
    )
    return res
  }
}