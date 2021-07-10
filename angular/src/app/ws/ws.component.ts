import { Component, OnInit, OnDestroy } from '@angular/core'
import { interval } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'

@Component({
  selector: 'app-ws',
  templateUrl: './ws.component.html',
  styleUrls: ['./ws.component.sass']
})
export class WsComponent implements OnInit, OnDestroy {
  connection$?: WebSocketSubject<any>
  user = ''
  data = ''
  connect = false
  error = ''
  retryTime = 0
  backoff = 1000 // 1 second
  initialBackoff = 1000 // 1 second
  maxBackoff = (1000 * 5 * 60) // 5 minutes

  constructor() { }

  ngOnInit(): void {
    interval(1000).subscribe(_ => {
      if(!this.connect) return

      if(!this.connection$ || this.connection$.closed)
        this.tryConnection()
    })

    //interval(1000).subscribe(n => {
      //console.log(this.connection$?.closed)
      // if(this.user && (!this.connection$ || this.connection$.closed)){
      //   this.tryConnection()
      // }

      //this.connection$?.next('ho there ' + n)
    //})
    //this.connection$.error({code: 4000, reason: 'I think our app just broke!'})
  }

  ngOnDestroy(): void {
    this.onDisconnect()
  }


  tryConnection(){
    if(+new Date < this.retryTime) return

    const host = window.location.host
    const prot = window.location.protocol == 'https:' ? 'wss:' : 'ws:'
    this.connection$ = webSocket(`${prot}//${host}/api/${this.user}`)
    this.connection$.subscribe(
      msg => {
        this.resetRetryTime() // get some data reset backoff
        this.data = msg.data.data
        console.log('message received: ' + JSON.stringify(msg))
      },
      err => {
        this.connection$?.unsubscribe()
        this.error = JSON.stringify(err, ["message", "arguments", "type", "name"])

        this.setRetryTime()

        console.log('error', err)
      },
      () => console.log('complete')
    )
  }

  onConnect(){
    this.onDisconnect() // remove previous connections
    this.connect = true
    this.tryConnection()
    console.log(this.user)
  }

  onDisconnect(){
    this.connect = false
    this.connection$?.complete()
    this.connection$?.unsubscribe()
  }

  onUpdate(){
    this.resetRetryTime() // sending data reset backoff
    this.connection$?.next(this.data)
    console.log(this.data)
  }

  resetRetryTime(){
    this.backoff = this.initialBackoff
    this.retryTime = 0
  }

  setRetryTime(){
    this.backoff = this.backoff * 2
    if(this.backoff > this.maxBackoff) this.backoff = this.maxBackoff
    this.retryTime = +new Date + this.backoff
  }
}
