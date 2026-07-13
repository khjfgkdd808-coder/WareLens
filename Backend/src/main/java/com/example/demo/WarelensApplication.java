package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class WarelensApplication {

    private static final Logger log = LoggerFactory.getLogger(WarelensApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(WarelensApplication.class, args);
        
        // 팀원들을 위한 구동 완료 알림
        log.info("====================================================");
        log.info("   [SERVER] 백엔드 서버 구동 완료!   ");
        log.info("====================================================");
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}