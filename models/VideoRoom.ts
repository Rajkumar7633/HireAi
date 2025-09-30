// import mongoose from "mongoose"

// export interface IVideoRoom extends mongoose.Document {
//   roomId: string
//   interviewId: mongoose.Types.ObjectId
//   hostId: mongoose.Types.ObjectId
//   participants: {
//     userId: mongoose.Types.ObjectId
//     peerId: string
//     joinedAt: Date
//     leftAt?: Date
//     isHost: boolean
//     mediaState: {
//       video: boolean
//       audio: boolean
//       screen: boolean
//     }
//   }[]
//   roomState: "waiting" | "active" | "ended"
//   recordingState: "not-started" | "recording" | "paused" | "stopped"
//   recordingData?: {
//     startTime: Date
//     endTime?: Date
//     fileUrl?: string
//     fileSize?: number
//   }
//   createdAt: Date
//   updatedAt: Date
// }

// const VideoRoomSchema = new mongoose.Schema<IVideoRoom>({
//   roomId: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   interviewId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "VideoInterview",
//     required: true,
//   },
//   hostId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   participants: [
//     {
//       userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//       },
//       peerId: {
//         type: String,
//         required: true,
//       },
//       joinedAt: {
//         type: Date,
//         default: Date.now,
//       },
//       leftAt: {
//         type: Date,
//         required: false,
//       },
//       isHost: {
//         type: Boolean,
//         default: false,
//       },
//       mediaState: {
//         video: {
//           type: Boolean,
//           default: true,
//         },
//         audio: {
//           type: Boolean,
//           default: true,
//         },
//         screen: {
//           type: Boolean,
//           default: false,
//         },
//       },
//     },
//   ],
//   roomState: {
//     type: String,
//     enum: ["waiting", "active", "ended"],
//     default: "waiting",
//   },
//   recordingState: {
//     type: String,
//     enum: ["not-started", "recording", "paused", "stopped"],
//     default: "not-started",
//   },
//   recordingData: {
//     startTime: {
//       type: Date,
//       required: false,
//     },
//     endTime: {
//       type: Date,
//       required: false,
//     },
//     fileUrl: {
//       type: String,
//       required: false,
//     },
//     fileSize: {
//       type: Number,
//       required: false,
//     },
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// })

// VideoRoomSchema.index({ roomId: 1 })
// VideoRoomSchema.index({ interviewId: 1 })
// VideoRoomSchema.index({ hostId: 1 })

// VideoRoomSchema.pre("save", function (next) {
//   this.updatedAt = new Date()
//   next()
// })

// export default mongoose.model<IVideoRoom>("VideoRoom", VideoRoomSchema)



// models/VideoRoom.ts (or wherever this should be located)
import mongoose from "mongoose"

export interface IVideoRoom extends mongoose.Document {
  roomId: string
  interviewId: mongoose.Types.ObjectId
  hostId: mongoose.Types.ObjectId
  participants: {
    userId: mongoose.Types.ObjectId
    peerId: string
    joinedAt: Date
    leftAt?: Date
    isHost: boolean
    mediaState: {
      video: boolean
      audio: boolean
      screen: boolean
    }
  }[]
  roomState: "waiting" | "active" | "ended"
  recordingState: "not-started" | "recording" | "paused" | "stopped"
  recordingData?: {
    startTime: Date
    endTime?: Date
    fileUrl?: string
    fileSize?: number
  }
  createdAt: Date
  updatedAt: Date
}

// Clear the model in development to prevent overwrite errors
if (process.env.NODE_ENV === 'development' && mongoose.models.VideoRoom) {
  delete mongoose.models.VideoRoom
}

const VideoRoomSchema = new mongoose.Schema<IVideoRoom>({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VideoInterview",
    required: true,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      peerId: {
        type: String,
        required: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      leftAt: {
        type: Date,
        required: false,
      },
      isHost: {
        type: Boolean,
        default: false,
      },
      mediaState: {
        video: {
          type: Boolean,
          default: true,
        },
        audio: {
          type: Boolean,
          default: true,
        },
        screen: {
          type: Boolean,
          default: false,
        },
      },
    },
  ],
  roomState: {
    type: String,
    enum: ["waiting", "active", "ended"],
    default: "waiting",
  },
  recordingState: {
    type: String,
    enum: ["not-started", "recording", "paused", "stopped"],
    default: "not-started",
  },
  recordingData: {
    startTime: {
      type: Date,
      required: false,
    },
    endTime: {
      type: Date,
      required: false,
    },
    fileUrl: {
      type: String,
      required: false,
    },
    fileSize: {
      type: Number,
      required: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Only keep one index definition for roomId
VideoRoomSchema.index({ roomId: 1 });
VideoRoomSchema.index({ interviewId: 1 })
VideoRoomSchema.index({ hostId: 1 })

VideoRoomSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

// Use the || pattern to prevent overwrite errors
export default mongoose.models.VideoRoom || mongoose.model<IVideoRoom>("VideoRoom", VideoRoomSchema)