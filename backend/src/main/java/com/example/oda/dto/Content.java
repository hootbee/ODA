package com.example.oda.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class Content {
    private List<Part> parts;
    private String role;
}
