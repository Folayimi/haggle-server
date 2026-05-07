import { and, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { webrtcPeers } from "../../src/db/schema/sessions";

export interface SignalingPayload {
  session_id: string;
  user_id: string;
  connection_role: string;
  peer_state?: string;
  sdp?: string;
  candidate?: string;
}

export class WebrtcRepository extends BaseRepository {
  private async upsertPeer(input: SignalingPayload) {
    const existing = await this.database
      .select()
      .from(webrtcPeers)
      .where(
        and(
          eq(webrtcPeers.session_id, input.session_id),
          eq(webrtcPeers.user_id, input.user_id),
        ),
      );

    if (existing.length === 0) {
      const [peer] = await this.database
        .insert(webrtcPeers)
        .values({
          session_id: input.session_id,
          user_id: input.user_id,
          connection_role: input.connection_role,
          peer_state: input.peer_state ?? "connecting",
        })
        .returning();

      return peer;
    }

    const [peer] = await this.database
      .update(webrtcPeers)
      .set({
        connection_role: input.connection_role,
        peer_state: input.peer_state ?? existing[0].peer_state,
        last_heartbeat_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(webrtcPeers.id, existing[0].id))
      .returning();

    return peer;
  }

  async registerOffer(input: SignalingPayload) {
    const peer = await this.upsertPeer({
      ...input,
      connection_role: "offerer",
      peer_state: input.peer_state ?? "offer_created",
    });

    return { peer, signal: { sdp: input.sdp } };
  }

  async registerAnswer(input: SignalingPayload) {
    const peer = await this.upsertPeer({
      ...input,
      connection_role: "answerer",
      peer_state: input.peer_state ?? "answer_created",
    });

    return { peer, signal: { sdp: input.sdp } };
  }

  async registerIceCandidate(input: SignalingPayload) {
    const peer = await this.upsertPeer({
      ...input,
      peer_state: input.peer_state ?? "ice_candidate_received",
    });

    return { peer, signal: { candidate: input.candidate } };
  }
}
