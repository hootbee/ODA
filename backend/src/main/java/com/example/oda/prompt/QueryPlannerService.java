package com.example.oda.prompt;

import com.example.oda.prompt.dto.QueryPlanDto;

public interface QueryPlannerService {
    QueryPlanDto createQueryPlan(String prompt);
}
