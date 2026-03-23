class PocketServerClient {
    private baseUrl: string;
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }
}

const pocketServerClient = new PocketServerClient("http://localhost:3000");

export default pocketServerClient;