import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { URLSearchParams } from 'url'

export class MageClient {

  readonly http: AxiosInstance
  accessToken: string | null = null
  user: any = null

  get authHeader(): { Authorization: string } {
    return { Authorization: `bearer ${this.accessToken}` }
  }

  constructor(readonly mageUrl: string) {
    this.http = axios.create({ baseURL: mageUrl })
    this.http.interceptors.request.use((config: InternalAxiosRequestConfig<any>) => {
      const headers = config.headers
      if (headers.hasAuthorization()) {
        return config
      }
      else if (!!this.accessToken) {
        headers.setAuthorization(this.authHeader.Authorization)
      }
      return config
    })
  }

  async signIn(username: string, password: string, device: string): Promise<void> {
    this.accessToken = null
    this.user = null
    try {
      const signInRes = await this.http.post(
        '/auth/local/signin',
        new URLSearchParams({ username, password }),
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          }
        }
      )
      const { user, token } = signInRes.data
      const authzRes = await this.http.post(
        '/auth/token',
        { uid: device },
        {
          headers: {
            'authorization': `bearer ${token}`,
            'content-type': 'application/json'
          }
        }
      )
      this.accessToken = authzRes.data.token
      this.user = user
      console.info('successfully signed in', user.username)
    }
    catch (err) {
      console.error(err)
    }
  }

  async listRoles(): Promise<AxiosResponse<Role[]>> {
    const res = await this.http.get<Role[]>('/api/roles')
    return res
  }

  async createUser(body: UserCreateRequest): Promise<AxiosResponse<any>> {
    const res = await this.http.post(`/api/users`, body)
    return res
  }

  async listEvents(): Promise<any> {
    const res = await this.http.get('/api/events')
    return res.data
  }

  async readEvent(id: number): Promise<any> {
    const res = await this.http.get(`/api/events/${id}`)
    return res.data
  }

  async postUserLocation(eventId: number, lon: number, lat: number): Promise<any> {
    const res = await this.http.post(`/api/events/${eventId}/locations`,
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
      }
    )
    return res
  }
}

export interface Role {
  id: string,
  name: string,
  description?: string,
  permissions: string[]
}

export interface UserCreateRequest {
  username: string
  displayName: string
  email?: string
  phone?: string
  roleId: string
  password: string
  passwordconfirm: string
}
