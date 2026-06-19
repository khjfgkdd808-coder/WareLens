package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

/**
 * [역할: 애플리케이션 엔트리 포인트]
 * - 스프링 부트 서버의 시작점
 */
@SpringBootApplication
public class WarelensApplication {

	public static void main(String[] args) {
		// [구동] 서버 엔진 가동
		SpringApplication.run(WarelensApplication.class, args);
	}

	// [설정] FastAPI와 통신하기 위한 RestTemplate 빈 등록
	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}
}