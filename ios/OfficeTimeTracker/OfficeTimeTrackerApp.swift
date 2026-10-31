import SwiftUI

@main
struct OfficeTimeTrackerApp: App {
    @State private var app = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
                .tint(.brand)
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        if app.isSignedIn {
            MainTabView()
        } else {
            AuthView()
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "clock") }
            MonthView()
                .tabItem { Label("Monthly", systemImage: "calendar") }
            YearView()
                .tabItem { Label("Yearly", systemImage: "chart.bar") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
