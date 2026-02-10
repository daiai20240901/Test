import SwiftUI

struct ContentView: View {
    @State private var counter = 0

    var body: some View {
        VStack(spacing: 16) {
            Text("最初のiPhoneアプリ")
                .font(.title)
                .bold()

            Text("カウント: \(counter)")
                .font(.headline)

            Button("+1する") {
                counter += 1
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
