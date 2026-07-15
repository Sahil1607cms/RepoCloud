import request from "supertest";
import app from "../app";

describe("GitHub Authentication", () => {

    test("GET /auth/github should redirect user to GitHub", async () => {

        const response = await request(app)
            .get("/auth/github");

        expect(response.status).toBe(302);

    });

});