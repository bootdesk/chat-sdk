import Foundation

public enum PushSubscriptionStatus: String, CaseIterable {
    case unsupported
    case `default`
    case subscribed
    case denied
    case subscribing
    case error
}
