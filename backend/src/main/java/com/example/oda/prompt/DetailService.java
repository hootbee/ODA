package com.example.oda.prompt;

import com.example.oda.entity.PublicData;
import reactor.core.publisher.Mono;

public interface DetailService {
    Mono<PublicData> getDataDetails(String prompt);
}
