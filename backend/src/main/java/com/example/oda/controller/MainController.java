package com.example.oda.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MainController {
    @GetMapping("/")
    public String mainPage() {
        return "Welcome to ODA Project Backend Server!";
    }
}
