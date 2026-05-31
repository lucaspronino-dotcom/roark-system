import { Injectable } from "@nestjs/common"

@Injectable()
export class AppService {
  getHealth() {
    return {
      ok: true,
      service: "roark-api",
    }
  }
}
