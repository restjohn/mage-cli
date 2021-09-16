import inquirer from 'inquirer'
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
}